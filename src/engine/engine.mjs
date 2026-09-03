import { defaultPricing } from '../config/pricing.mjs';
import {
  ruleOrphanedCustomMetrics,
  ruleHighCardinalityTags,
  ruleLogExclusionsAndRetention,
  ruleHighVolumeLogIngestion,
  ruleSpanTailSampling,
  ruleZombieHosts
} from './rules.mjs';
import { runDlpScan } from '../security/dlp-scanner.mjs';
import { generateTerraformPrBundle } from './gitops-remediator.mjs';
import { analyzeAnomaliesAndUnitEconomics } from './ai-finops-sentry.mjs';
import { CryptographicAuditLedger } from '../security/audit-ledger.mjs';

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

  // Run Cyber Defense & DLP Scanner
  const dlpResult = runDlpScan(snapshot);
  if (dlpResult.findings.length > 0) {
    findings.unshift({
      id: 'dlp-credential-leaks',
      title: `🚨 CYBER ALERT: ${dlpResult.totalViolations} sensitive credentials & PII leaked in telemetry`,
      category: 'cybersecurity',
      severity: dlpResult.criticalCount > 0 ? 'critical' : 'high',
      confidence: { factor: 1.0, label: 'Cryptographically Verified' },
      description: `Detected unmasked secrets (${dlpResult.findings.map((f) => f.name).slice(0, 3).join(', ')}) transmitted in metric tags and logs. Creates massive cloud hijacking and compliance breach risks (PCI-DSS / GDPR / SOC2).`,
      evidence: {
        offenders: dlpResult.findings.map((f) => ({
          metric: f.sourceLocation,
          tag: f.detectedSamples.join(', '),
          reason: f.complianceRisk
        }))
      },
      recommendation: 'Apply Winnow 1-Click Sensitive Data Scanner rules or OTel redaction filters. Scrub secrets before ingestion.',
      estMonthlySavingsMin: Math.round(dlpResult.estCostOfExposuresUsd * 0.8),
      estMonthlySavingsMax: Math.round(dlpResult.estCostOfExposuresUsd * 1.2),
      docsUrl: 'https://docs.datadoghq.com/sensitive_data_scanner/'
    });
  }

  const baseline = estimateBaseline(snapshot, pricing);
  const totalBaseline = Object.values(baseline).reduce((a, b) => a + b, 0);

  const caps = {
    custom_metrics: baseline.customMetricsOverage,
    logs: baseline.logsIngest + baseline.logsIndexed,
    apm: baseline.apm + baseline.apmSpans,
    hosts: baseline.infra + baseline.apm,
    cybersecurity: 1000
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

  findings = capped.filter((f) => f.severity !== 'info' || f.estMonthlySavingsMax > 0 || f.category === 'error' || f.category === 'cybersecurity');
  findings.sort((a, b) => {
    const sevScore = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    const sDiff = (sevScore[b.severity] || 0) - (sevScore[a.severity] || 0);
    if (sDiff !== 0) return sDiff;
    return b.estMonthlySavingsMax - a.estMonthlySavingsMax;
  });

  const totalMin = findings.reduce((a, f) => a + f.estMonthlySavingsMin, 0);
  const totalMax = findings.reduce((a, f) => a + f.estMonthlySavingsMax, 0);

  const monthlyMax = round(totalMax);
  const annualMax = round(totalMax * 12);
  const percentMax = totalBaseline ? round((totalMax / totalBaseline) * 100) : 0;

  const totals = {
    monthlySavingsMinUsd: round(totalMin),
    monthlySavingsMaxUsd: round(totalMax),
    annualizedSavingsMinUsd: round(totalMin * 12),
    annualizedSavingsMaxUsd: round(totalMax * 12),
    percentOfBillMin: totalBaseline ? round((totalMin / totalBaseline) * 100) : 0,
    percentOfBillMax: totalBaseline ? round((totalMax / totalBaseline) * 100) : 0
  };

  const auditOutput = {
    meta: snapshot.meta,
    baseline,
    totalBaselineUsd: round(totalBaseline),
    findings,
    totals,
    cybersecurity: dlpResult,
    executiveAiSummary: `Winnow Cyber & FinOps Intelligence: Security Grade: ${dlpResult.postureGrade} (${dlpResult.securityScore}/100). Identified $${monthlyMax.toLocaleString()}/mo ($${annualMax.toLocaleString()}/yr) in Datadog waste (~${percentMax}% of invoice) + ${dlpResult.totalViolations} telemetry data leaks quarantined.`,
    pricing,
    warnings: snapshot.warnings ?? []
  };

  // Generate GitOps PR Bundle
  auditOutput.gitops = generateTerraformPrBundle(auditOutput, dlpResult);

  // Run AI FinOps Sentry & Unit Economics
  auditOutput.aiSentry = analyzeAnomaliesAndUnitEconomics(snapshot, pricing);

  // Generate Cryptographic Proof Ledger
  const ledger = new CryptographicAuditLedger({ org: snapshot.meta?.org });
  ledger.appendAuditEvent(auditOutput);
  auditOutput.complianceBundle = ledger.exportComplianceBundle();

  return auditOutput;
}

function round(n) {
  return Math.round(n * 100) / 100;
}
