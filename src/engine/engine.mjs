import { defaultPricing } from '../config/pricing.mjs';
import {
  ruleOrphanedCustomMetrics,
  ruleHighCardinalityTags,
  ruleLogExclusionsAndRetention,
  ruleHighVolumeLogIngestion,
  ruleSpanTailSampling,
  ruleZombieHosts
} from './rules.mjs';

export function estimateBaseline(snapshot, pricing = defaultPricing) {
  const u = snapshot.usage;
  const included = pricing.customMetricsIncludedPerHost * (u.infraHostsAvg ?? 0);
  const customMetrics =
    Math.max(0, (u.customMetricsTotal ?? 0) - included) *
    (pricing.customMetricsOveragePer100PerMonth / 100);

  let logsIndexed = 0;
  for (const idx of snapshot.logIndexes ?? []) {
    const eventsM = ((idx.eventShare ?? 0) * (u.logsIndexedEvents ?? 0)) / 1e6;
    logsIndexed +=
      eventsM * pricing.logsIndexedPerMillionEvents15d * (pricing.retentionMultipliers[idx.retentionDays] ?? 1);
  }

  return {
    customMetricsOverage: round(customMetrics),
    infra: round((u.infraHostsAvg ?? 0) * pricing.infraHostPerMonth),
    apm: round((u.apmHostsAvg ?? 0) * pricing.apmHostPerMonth),
    logsIngest: round((u.logsIngestedGb ?? 0) * pricing.logsIngestedPerGb),
    logsIndexed: round(logsIndexed),
    apmSpans: round(((u.spansIndexedEvents ?? 0) / 1e6) * pricing.spansIndexedPerMillionEvents),
    other: u.otherMonthlySpendUsd ?? 0
  };
}

export function runAudit(snapshot, pricing = defaultPricing) {
  const rules = [
    ruleOrphanedCustomMetrics,
    ruleHighCardinalityTags,
    ruleLogExclusionsAndRetention,
    ruleHighVolumeLogIngestion,
    ruleSpanTailSampling,
    ruleZombieHosts
  ];

  let findings = [];
  for (const rule of rules) {
    try {
      const result = rule(snapshot, pricing);
      if (!result) continue;
      findings.push(...(result.multi ?? [result]));
    } catch (err) {
      findings.push({
        id: `rule-error-${rule.name}`,
        title: `Rule ${rule.name} could not run`,
        category: 'error',
        severity: 'info',
        confidence: { factor: 0, label: 'Error' },
        description: err.message,
        recommendation: 'Check collector warnings.',
        estMonthlySavingsMin: 0,
        estMonthlySavingsMax: 0
      });
    }
  }

  const baseline = estimateBaseline(snapshot, pricing);
  const totalBaseline = Object.values(baseline).reduce((a, b) => a + b, 0);

  const caps = {
    custom_metrics: baseline.customMetricsOverage,
    logs: baseline.logsIngest + baseline.logsIndexed,
    apm: baseline.apm + baseline.apmSpans,
    hosts: baseline.infra + baseline.apm
  };
  const spent = {};
  const capped = findings.map((f) => {
    if (!(f.category in caps)) return f;
    spent[f.category] = spent[f.category] ?? 0;
    const room = Math.max(0, caps[f.category] - spent[f.category]);
    const max = Math.min(f.estMonthlySavingsMax, room);
    const min = Math.min(f.estMonthlySavingsMin, max);
    spent[f.category] += max;
    return { ...f, estMonthlySavingsMax: Math.round(max), estMonthlySavingsMin: min };
  });

  findings = capped.filter((f) => f.severity !== 'info' || f.estMonthlySavingsMax > 0 || f.category === 'error');
  findings.sort((a, b) => b.estMonthlySavingsMax - a.estMonthlySavingsMax);

  const totalMin = findings.reduce((a, f) => a + f.estMonthlySavingsMin, 0);
  const totalMax = findings.reduce((a, f) => a + f.estMonthlySavingsMax, 0);

  return {
    meta: snapshot.meta,
    baseline,
    totalBaselineUsd: round(totalBaseline),
    findings,
    totals: {
      monthlySavingsMinUsd: round(totalMin),
      monthlySavingsMaxUsd: round(totalMax),
      annualizedSavingsMinUsd: round(totalMin * 12),
      annualizedSavingsMaxUsd: round(totalMax * 12),
      percentOfBillMin: totalBaseline ? round((totalMin / totalBaseline) * 100) : 0,
      percentOfBillMax: totalBaseline ? round((totalMax / totalBaseline) * 100) : 0
    },
    warnings: snapshot.warnings ?? []
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
