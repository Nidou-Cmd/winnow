const SITES = {
  'datadoghq.com': 'https://api.datadoghq.com',
  'us3.datadoghq.com': 'https://api.us3.datadoghq.com',
  'us5.datadoghq.com': 'https://api.us5.datadoghq.com',
  'datadoghq.eu': 'https://api.datadoghq.eu',
  'ap1.datadoghq.com': 'https://api.ap1.datadoghq.com',
  'ddog-gov.com': 'https://api.ddog-gov.com'
};

export function resolveBaseUrl(site) {
  const key = String(site || 'datadoghq.com').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return SITES[key] || `https://api.${key}`;
}

export class DatadogClient {
  constructor({ apiKey, appKey, site }) {
    if (!apiKey || !appKey) throw new Error('Both DD_API_KEY and DD_APP_KEY are required for live audits');
    this.apiKey = apiKey;
    this.appKey = appKey;
    this.baseUrl = resolveBaseUrl(site);
    this.warnings = [];
  }

  async request(path, { query = {}, method = 'GET', retries = 2 } = {}) {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'DD-API-KEY': this.apiKey,
          'DD-APPLICATION-KEY': this.appKey,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      throw new Error(`Network error calling ${path}: ${err.message}`);
    }
    if ((res.status === 403 || res.status === 401) && path !== '/api/v1/validate') {
      throw Object.assign(
        new Error(`Access denied (${res.status}) on ${path}. Verify both keys and that the app key has usage_read + metrics/dashboards/logs read permissions.`),
        { status: res.status }
      );
    }
    if (res.status === 429) {
      if (retries <= 0) throw new Error(`Rate limited on ${path}`);
      await new Promise((r) => setTimeout(r, 1500));
      return this.request(path, { query, method, retries: retries - 1 });
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Object.assign(new Error(`Datadog API error ${res.status} on ${path}: ${body.slice(0, 300)}`), { status: res.status });
    }
    return res.json();
  }

  async safe(path, { query = {} } = {}) {
    try {
      return await this.request(path, { query });
    } catch (err) {
      this.warnings.push(`${path}: ${err.message}`);
      return null;
    }
  }

  async collectAll({ month } = {}) {
    const now = new Date();
    const monthParam =
      month ||
      new Date(now.getFullYear(), Math.max(0, now.getMonth() - 1), 1).toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 19);
    const nowHr = now.toISOString().slice(0, 19);

    // 1. Collect usage meters
    const [usageCustom, usageLogs, usageHosts, usageSpans, attribution] = await Promise.all([
      this.safe('/api/v1/usage/custom_metrics', { month: monthParam }),
      this.safe('/api/v1/usage/logs', { start_hr: weekAgo, end_hr: nowHr }),
      this.safe('/api/v1/usage/host_hour', { start_hr: weekAgo, end_hr: nowHr }),
      this.safe('/api/v2/usage/apm_host_hour', { start_hr: weekAgo, end_hr: nowHr }),
      this.safe('/api/v2/usage/attribution', { month: monthParam, fields: 'custom_metrics' })
    ]);

    // 2. Collect query surfaces: Dashboards, Monitors, Notebooks, and SLOs (preventing false positives!)
    const [dashboards, monitors, notebooks, slos, logIndexes, hostList] = await Promise.all([
      this.safe('/api/v1/dashboard'),
      this.safe('/api/v1/monitor', { page_size: 1000 }),
      this.safe('/api/v1/notebooks', { count: 100 }),
      this.safe('/api/v1/slo', { limit: 1000 }),
      this.safe('/api/v1/logs/config/indexes'),
      this.safe('/api/v1/hosts', { count: 1000 })
    ]);

    // 3. Collect active metric inventory
    const metricNames = [];
    let cursor;
    for (let page = 0; page < 20; page++) {
      const query = { window_seconds: 604800 };
      if (cursor) query['page[cursor]'] = cursor;
      const res = await this.safe('/api/v2/metrics', { query });
      if (!res?.data) break;
      metricNames.push(...res.data.map((m) => m.attributes?.name ?? m.id));
      cursor = res.meta?.page?.after;
      if (!cursor) break;
    }

    // 4. Extract top attribution metrics and enrich with live tags
    const topMetrics = extractAttributionMetrics(attribution);
    if (topMetrics.length > 0) {
      // Enrich top 15 metrics with tag configurations
      await Promise.all(
        topMetrics.slice(0, 15).map(async (m) => {
          const tagData = await this.safe(`/api/v2/metrics/${encodeURIComponent(m.metric)}/all-tags`);
          if (tagData?.data?.attributes?.tags) {
            m.tags = tagData.data.attributes.tags;
          }
        })
      );
    }

    // 5. Group live hosts to detect staging/dev zombie hosts
    const hostsSummary = extractLiveHostsSummary(hostList);

    return {
      meta: {
        org: null,
        site: this.baseUrl,
        generatedAt: now.toISOString(),
        source: 'live',
        month: monthParam
      },
      usage: normalizeUsage({ usageCustom, usageLogs, usageHosts, usageSpans, attribution }),
      metrics: metricNames.map((name) => ({ name })),
      attributionTopMetrics: topMetrics,
      queriedMetricNames: extractQueriedMetrics(dashboards, monitors, notebooks, slos),
      logIndexes: (logIndexes?.indexes ?? []).map((idx) => ({
        name: idx.name,
        filter: idx.filter?.query ?? '*',
        exclusionFilters: idx.exclusion_filters ?? [],
        retentionDays: idx.num_retention_days ?? 15
      })),
      hosts: hostsSummary,
      warnings: this.warnings
    };
  }
}

function sumHours(usageResponse, pick) {
  if (!usageResponse?.usage) return 0;
  return usageResponse.usage.reduce((acc, h) => acc + (pick(h) ?? 0), 0);
}

export function normalizeUsage({ usageCustom, usageLogs, usageHosts, usageSpans, attribution }) {
  const customMetricsTotal =
    sumHours(usageCustom, (h) => h.usage_amount ?? h.custom_metrics_usage) ||
    sumHours(usageCustom, (h) => h.hour_f ? h.custom_metrics_usage : 0);
  const logsIngestedGb = sumHours(usageLogs, (h) => h.ingested_usage_bytes) / 1e9;
  const logsIndexedEvents = sumHours(usageLogs, (h) => h.indexed_events_usage);
  const spansIndexedEvents = sumHours(usageSpans, (h) => h.indexed_events_usage ?? h.indexed_events ?? h.events);
  const infraHostHours = sumHours(usageHosts, (h) => h.host_hour_usage ?? h.host_hours);
  const apmHostHours = Array.isArray(usageSpans)
    ? usageSpans.reduce((a, r) => a + (r.host_hour_usage ?? 0), 0)
    : usageSpans?.usage?.reduce((a, r) => a + (r.host_hour_usage ?? 0), 0) ?? 0;

  return {
    customMetricsTotal,
    logsIngestedGb,
    logsIndexedEvents,
    spansIndexedEvents,
    infraHostsAvg: infraHostHours / 168 || 0,
    apmHostsAvg: apmHostHours / 168 || 0,
    attributionAvailable: Boolean(attribution?.usage)
  };
}

export function extractAttributionMetrics(attribution) {
  const rows = attribution?.usage ?? [];
  const out = [];
  for (const row of rows) {
    for (const item of row.metrics ?? []) {
      out.push({
        metric: item.metric_name,
        seriesCount: item.custom_metrics ?? item.value ?? 0,
        tags: item.tags ?? []
      });
    }
  }
  return out;
}

export function extractLiveHostsSummary(hostListRes) {
  if (!hostListRes?.host_list?.length) return [];
  const envGroups = {};
  for (const host of hostListRes.host_list) {
    const tags = host.tags_by_source ? Object.values(host.tags_by_source).flat() : [];
    let detectedEnv = 'production';
    for (const tag of tags) {
      if (typeof tag === 'string') {
        const lower = tag.toLowerCase();
        if (lower.startsWith('env:staging') || lower.startsWith('env:stg')) detectedEnv = 'staging';
        else if (lower.startsWith('env:dev') || lower.startsWith('env:development')) detectedEnv = 'dev';
        else if (lower.startsWith('env:qa') || lower.startsWith('env:test') || lower.startsWith('env:sandbox')) detectedEnv = 'preview';
      }
    }

    envGroups[detectedEnv] = envGroups[detectedEnv] || { count: 0, names: [] };
    envGroups[detectedEnv].count += 1;
    if (envGroups[detectedEnv].names.length < 3) envGroups[detectedEnv].names.push(host.name);
  }

  const out = [];
  for (const [env, data] of Object.entries(envGroups)) {
    if (['staging', 'dev', 'preview'].includes(env)) {
      out.push({
        name: `${data.names.join(', ')}... (${data.count} hosts)`,
        env,
        count: data.count,
        monitoredHoursPerWeek: 168 // Active agents reporting all week
      });
    }
  }
  return out;
}

const METRIC_TOKEN = /\b([a-zA-Z][a-zA-Z0-9_\-\/]*(?:\.[a-zA-Z0-9_\-\/]+)+)\b/g;

export function extractQueriedMetrics(dashboardsRes, monitorsRes, notebooksRes = null, slosRes = null) {
  const found = new Set();
  const scanText = (text) => {
    if (typeof text !== 'string') return;
    for (const match of text.matchAll(METRIC_TOKEN)) {
      const clean = match[1].replace(/[*:,{}]+$/, '');
      if (clean) found.add(clean);
    }
  };
  const walk = (node) => {
    if (typeof node === 'string') {
      scanText(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (['q', 'query', 'metric', 'metrics', 'formula', 'expression', 'target', 'numerator', 'denominator'].includes(key)) {
          scanText(String(value));
        }
        walk(value);
      }
    }
  };

  // Inspect Dashboards
  walk(dashboardsRes?.dashboards ?? dashboardsRes ?? []);
  // Inspect Monitors
  walk(monitorsRes ?? []);
  // Inspect Notebooks
  if (notebooksRes) walk(notebooksRes?.data ?? notebooksRes?.notebooks ?? notebooksRes);
  // Inspect SLOs (preventing catastrophic false positives on production SLO metrics!)
  if (slosRes) walk(slosRes?.data ?? slosRes);

  return found;
}
