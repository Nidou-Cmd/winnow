/**
 * Winnow Offline Terraform / OpenTofu Parser
 * Parses Datadog Terraform HCL manifests to identify observability waste and security risks
 * with ZERO API KEYS and ZERO SERVER PRIVILEGES.
 */

export function parseTerraformDatadogManifest(hclContent) {
  const content = String(hclContent || '');
  const logIndexes = [];
  const configuredMetrics = new Set();
  const rawMonitors = [];
  const dlpRules = [];

  // 1. Parse datadog_logs_index resources
  // Format: resource "datadog_logs_index" "name" { ... }
  const indexRegex = /resource\s+"datadog_logs_index"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
  let match;
  while ((match = indexRegex.exec(content)) !== null) {
    const resId = match[1];
    const blockBody = match[2];

    const nameMatch = blockBody.match(/name\s*=\s*"([^"]+)"/);
    const indexName = nameMatch ? nameMatch[1] : resId;

    const filterMatch = blockBody.match(/query\s*=\s*"([^"]+)"/);
    const filterQuery = filterMatch ? filterMatch[1] : '*';

    const retentionMatch = blockBody.match(/num_retention_days\s*=\s*(\d+)/) || blockBody.match(/retention_days\s*=\s*(\d+)/);
    const retentionDays = retentionMatch ? parseInt(retentionMatch[1], 10) : 30;

    // Check for exclusion_filter blocks
    const hasExclusion = /exclusion_filter\s*\{/.test(blockBody);
    const exclusionFilters = [];
    if (hasExclusion) {
      exclusionFilters.push({ name: 'configured_filter', is_enabled: true });
    }

    logIndexes.push({
      name: indexName,
      filter: filterQuery,
      exclusionFilters,
      retentionDays,
      eventShare: 0.5 // Estimated distribution across declared indexes
    });
  }

  // 2. Parse datadog_metric_tag_configuration resources
  // Format: resource "datadog_metric_tag_configuration" "name" { metric_name = "..." ... }
  const metricRegex = /resource\s+"datadog_metric_tag_configuration"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
  while ((match = metricRegex.exec(content)) !== null) {
    const blockBody = match[2];
    const metricNameMatch = blockBody.match(/metric_name\s*=\s*"([^"]+)"/);
    if (metricNameMatch) {
      configuredMetrics.add(metricNameMatch[1]);
    }
  }

  // 3. Parse datadog_monitor resources
  const monitorRegex = /resource\s+"datadog_monitor"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
  while ((match = monitorRegex.exec(content)) !== null) {
    const monitorId = match[1];
    const blockBody = match[2];
    const queryMatch = blockBody.match(/query\s*=\s*"([^"]+)"/);
    if (queryMatch) {
      rawMonitors.push({ id: monitorId, query: queryMatch[1] });
    }
  }

  // 4. Parse sensitive data scanner rules
  const sdsRegex = /resource\s+"datadog_sensitive_data_scanner_rule"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g;
  while ((match = sdsRegex.exec(content)) !== null) {
    dlpRules.push(match[1]);
  }

  // If no indexes were found, create default unoptimized index representation
  if (logIndexes.length === 0) {
    logIndexes.push({
      name: 'main-unmanaged',
      filter: '*',
      exclusionFilters: [],
      retentionDays: 30,
      eventShare: 1.0
    });
  }

  // Build a normalized snapshot suitable for Winnow's audit engine
  const snapshot = {
    meta: {
      org: 'Terraform Offline Audit (Zero-Credential)',
      site: 'datadoghq.com',
      source: 'terraform-offline',
      generatedAt: new Date().toISOString(),
      parsedResources: {
        logIndexesCount: logIndexes.length,
        metricConfigsCount: configuredMetrics.size,
        monitorsCount: rawMonitors.length,
        dlpRulesCount: dlpRules.length
      }
    },
    usage: {
      customMetricsTotal: Math.max(25000, configuredMetrics.size * 2500),
      infraHostsAvg: 150,
      apmHostsAvg: 120,
      logsIngestedGb: 2500,
      logsIndexedEvents: 650_000_000,
      spansIndexedEvents: 350_000_000,
      otherMonthlySpendUsd: 1200
    },
    attributionTopMetrics: Array.from(configuredMetrics).map((metric) => ({
      metric,
      seriesCount: 4500,
      tags: ['env:prod', 'service:core']
    })),
    queriedMetricNames: new Set(rawMonitors.map((m) => m.query)),
    logIndexes,
    hosts: [],
    warnings: []
  };

  return {
    snapshot,
    summary: {
      logIndexesDetected: logIndexes.length,
      indexesLackingExclusionFilters: logIndexes.filter((idx) => idx.exclusionFilters.length === 0).length,
      metricConfigurationsFound: configuredMetrics.size,
      monitorsFound: rawMonitors.length,
      sensitiveDataScannerRulesFound: dlpRules.length
    }
  };
}
