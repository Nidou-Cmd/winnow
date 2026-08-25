import { highCardinalityPatterns, confidence } from '../config/pricing.mjs';

const fmt = (n) => Math.round(n);

export function ruleOrphanedCustomMetrics(snapshot, pricing) {
  if (!snapshot.attributionTopMetrics?.length) return null;
  const queried = snapshot.queriedMetricNames ?? new Set();
  const orphans = snapshot.attributionTopMetrics.filter(
    (m) => !queried.has(m.metric) && !m.metric.startsWith('datadog.')
  );
  const orphanedSeries = orphans.reduce((a, m) => a + (m.seriesCount ?? 0), 0);
  if (orphanedSeries === 0) return null;

  const included = pricing.customMetricsIncludedPerHost * snapshot.usage.infraHostsAvg;
  const billable = Math.max(0, snapshot.usage.customMetricsTotal - included);
  const savings = Math.min(orphanedSeries, billable) * (pricing.customMetricsOveragePer100PerMonth / 100);

  return {
    id: 'orphaned-custom-metrics',
    title: `${orphans.length} custom metrics are never queried anywhere`,
    category: 'custom_metrics',
    severity: savings > 300 ? 'high' : 'medium',
    confidence: confidence.measured,
    description:
      'Cross-referencing your active metrics against every dashboard and monitor query found metrics that nobody has looked at in 30+ days, yet they keep generating billable time series.',
    evidence: {
      topOffenders: orphans
        .sort((a, b) => b.seriesCount - a.seriesCount)
        .slice(0, 10)
        .map((m) => ({ metric: m.metric, series: m.seriesCount }))
    },
    recommendation:
      'Delete these metric names at the source (code/Agent config), or protect them with Metrics without Limits while you migrate. Re-run this audit after one billing cycle.',
    estMonthlySavingsMin: fmt(savings * 0.85),
    estMonthlySavingsMax: fmt(savings * 1.15),
    docsUrl: 'https://docs.datadoghq.com/metrics/guide/custom_metrics_governance/'
  };
}

export function ruleHighCardinalityTags(snapshot, pricing) {
  const queried = snapshot.queriedMetricNames ?? new Set();
  const offenders = [];
  for (const m of snapshot.attributionTopMetrics ?? []) {
    if (!queried.has(m.metric)) continue;
    for (const tag of m.tags ?? []) {
      const hit = highCardinalityPatterns.find((p) => p.tag.test(tag));
      if (hit) {
        offenders.push({ metric: m.metric, tag, reason: hit.label, series: m.seriesCount });
        break;
      }
    }
  }
  if (!offenders.length) return null;

  const included = pricing.customMetricsIncludedPerHost * snapshot.usage.infraHostsAvg;
  const pool =
    Math.max(0, snapshot.usage.customMetricsTotal - included) *
    (pricing.customMetricsOveragePer100PerMonth / 100);
  if (pool <= 0) return null;
  const savings = pool * 0.4;

  return {
    id: 'high-cardinality-tags',
    title: `${offenders.length} actively-used metrics carry high-cardinality tags`,
    category: 'custom_metrics',
    severity: 'medium',
    confidence: confidence.estimated,
    description:
      'These metrics ARE used in dashboards, but tags like customer_id / pod_name / session_id multiply each of them into thousands of billable series. Dropping just the toxic tag keeps your dashboards working.',
    evidence: { offenders: offenders.slice(0, 10) },
    recommendation:
      'Remove the offending tag from instrumentation and pre-aggregate at source (e.g. roll per-customer into per-service). Use Metrics without Limits to keep only the tag combinations you actually query.',
    estMonthlySavingsMin: fmt(savings * 0.5),
    estMonthlySavingsMax: fmt(savings * 1.2),
    docsUrl: 'https://docs.datadoghq.com/metrics/summary/#explore-your-custom-metrics'
  };
}

export function ruleLogExclusionsAndRetention(snapshot, pricing) {
  const findings = [];
  for (const idx of snapshot.logIndexes ?? []) {
    if (idx.complianceRequired) continue;
    const eventsM = ((idx.eventShare ?? 0) * (snapshot.usage.logsIndexedEvents ?? 0)) / 1e6;
    const multiplier = pricing.retentionMultipliers[idx.retentionDays] ?? 1;
    const currentCost = eventsM * pricing.logsIndexedPerMillionEvents15d * multiplier;

    const missingExclusions = (idx.exclusionFilters?.length ?? 0) === 0 && eventsM > 5;
    const retentionTooLong = idx.retentionDays > 15;
    if (!missingExclusions && !retentionTooLong) continue;

    let cutFactor = 0;
    const actions = [];
    if (missingExclusions) {
      cutFactor += idx.neverQueriedSources ? 0.6 : 0.2;
      actions.push(
        idx.neverQueriedSources
          ? 'add exclusion filters dropping debug/trace-dump sources (~60% of volume is never queried)'
          : 'add exclusion filters for healthcheck/noise patterns (~20% typical)'
      );
    }
    if (retentionTooLong) actions.push(`drop retention from ${idx.retentionDays}d to 15d`);

    const newMultiplier = retentionTooLong ? 1 : multiplier;
    const newCost = eventsM * (1 - cutFactor) * pricing.logsIndexedPerMillionEvents15d * newMultiplier;
    const ingestSaving = idx.neverQueriedSources
      ? snapshot.usage.logsIngestedGb * 0.25 * (idx.eventShare ?? 0) * pricing.logsIngestedPerGb
      : 0;
    const savings = currentCost - newCost + ingestSaving;
    if (savings < 20) continue;

    findings.push({
      id: `log-index-${idx.name}`,
      title: `Log index "${idx.name}" burns $${fmt(currentCost)}/mo${missingExclusions ? ' with zero exclusions' : ''}${retentionTooLong ? ` and ${idx.retentionDays}d retention` : ''}`,
      category: 'logs',
      severity: currentCost > 400 ? 'high' : 'medium',
      confidence: idx.neverQueriedSources ? confidence.measured : confidence.estimated,
      description: `Index "${idx.name}" matches filter "${idx.filter}" and indexes ~${Math.round(eventsM)}M events/month at ${idx.retentionDays}d retention.`,
      evidence: { index: idx.name, monthlyIndexedEventsM: Math.round(eventsM), currentMonthlyCostUsd: fmt(currentCost) },
      recommendation: actions.join('; ') + '.',
      estMonthlySavingsMin: fmt(savings * 0.7),
      estMonthlySavingsMax: fmt(savings * 1.1),
      docsUrl: 'https://docs.datadoghq.com/logs/indexes/'
    });
  }
  return findings.length ? { multi: findings } : null;
}

export function ruleSpanTailSampling(snapshot, pricing) {
  const spans = snapshot.usage.spansIndexedEvents ?? 0;
  if (spans < 10_000_000) return null;
  const current = (spans / 1e6) * pricing.spansIndexedPerMillionEvents;
  const savings = current * 0.75;
  return {
    id: 'span-tail-sampling',
    title: `APM spans are indexed unsampled ($${fmt(current)}/mo)`,
    category: 'apm',
    severity: current > 200 ? 'high' : 'low',
    confidence: confidence.estimated,
    description:
      '~' +
      Math.round(spans / 1e6) +
      'M APM span events are retained every month with default sampling. Healthy traffic dominates the bill; errors and slow traces are what you actually debug.',
    evidence: { monthlyIndexedSpansM: Math.round(spans / 1e6), currentMonthlyCostUsd: fmt(current) },
    recommendation:
      'Enable tail-sampling in the Datadog Agent or OTel Collector: keep 100% of error/slow traces, sample healthy ones to 10-20%. If you run both the Agent AND an OpenTelemetry pipeline on the same hosts, deduplicate before sampling.',
    estMonthlySavingsMin: fmt(savings * 0.6),
    estMonthlySavingsMax: fmt(savings * 1.05),
    docsUrl: 'https://docs.datadoghq.com/tracing/sample_rates/#tail-sampling'
  };
}

export function ruleZombieHosts(snapshot, pricing) {
  const zombies = (snapshot.hosts ?? []).filter(
    (h) => h.monitoredHoursPerWeek >= 160 && ['staging', 'dev', 'preview'].includes(h.env)
  );
  const count = zombies.reduce((a, h) => a + (h.count ?? 1), 0);
  if (count === 0) return null;
  const fullCost = count * (pricing.infraHostPerMonth + pricing.apmHostPerMonth);
  const savings = fullCost * 0.73;
  return {
    id: 'zombie-hosts-staging',
    title: `${count} staging/dev hosts monitored 24/7`,
    category: 'hosts',
    severity: count > 10 ? 'medium' : 'low',
    confidence: confidence.estimated,
    description:
      'Non-production environments run ~40h/week but their monitoring meters run 168h/week. You pay infra + APM around the clock for machines nobody watches overnight.',
    evidence: { groups: zombies.map((z) => ({ env: z.env, hosts: z.count })) },
    recommendation:
      'Schedule agents off-hours on non-prod (systemd timer / k8s cron scaling), or exclude dev/staging from APM billing pools. 73% saving is typical with business-hours-only monitoring.',
    estMonthlySavingsMin: fmt(savings * 0.6),
    estMonthlySavingsMax: fmt(savings),
    docsUrl: 'https://docs.datadoghq.com/account_management/billing/'
  };
}

export function ruleHighVolumeLogIngestion(snapshot, pricing) {
  const ingestedGb = snapshot.usage.logsIngestedGb ?? 0;
  if (ingestedGb < 500) return null;
  const currentCost = ingestedGb * pricing.logsIngestedPerGb;
  const savings = currentCost * 0.35;
  return {
    id: 'high-volume-log-ingestion',
    title: `Massive log ingestion volume (${Math.round(ingestedGb).toLocaleString()} GB/mo, $${fmt(currentCost)}/mo)`,
    category: 'logs',
    severity: currentCost > 300 ? 'high' : 'medium',
    confidence: confidence.estimated,
    description: `Your application sends ~${Math.round(ingestedGb).toLocaleString()} GB of raw logs per month into Datadog ingestion pipelines. Much of this is debug or noisy heartbeat data that can be filtered at the Agent level before hitting network ingestion.`,
    recommendation: 'Configure log processing rules in the Datadog Agent (log_processing_rules: exclude_at_match) to discard health checks, router keep-alives, and debug payloads at source before network ingestion.',
    estMonthlySavingsMin: fmt(savings * 0.7),
    estMonthlySavingsMax: fmt(savings * 1.15),
    docsUrl: 'https://docs.datadoghq.com/agent/logs/advanced_log_collection/?tab=configurationfiles#filter-logs'
  };
}

export function ruleAwsUnattachedEbsVolumes(snapshot) {
  const unattached = snapshot.awsUnattachedEbsVolumes ?? [];
  if (!unattached.length) return null;
  const monthlySavings = unattached.reduce((acc, vol) => acc + (vol.gbSize ?? 0) * 0.10, 0);

  return {
    id: 'aws-unattached-ebs-volumes',
    title: `${unattached.length} unattached AWS EBS volumes incurring storage charges`,
    category: 'aws_cloud',
    severity: monthlySavings > 150 ? 'high' : 'medium',
    confidence: confidence.measured,
    description: 'Found unattached EBS volumes (detached from EC2 instances) that continue to incur storage fees.',
    recommendation: 'Create a snapshot if data is needed, then delete unattached EBS volumes via AWS Console or CLI.',
    estMonthlySavingsMin: fmt(monthlySavings * 0.9),
    estMonthlySavingsMax: fmt(monthlySavings * 1.1),
    docsUrl: 'https://aws.amazon.com/ebs/pricing/'
  };
}
