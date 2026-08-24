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

    const [usageCustom, usageLogs, usageHosts, usageSpans, attribution] = await Promise.all([
      this.safe('/api/v1/usage/custom_metrics', { month: monthParam }),
      this.safe('/api/v1/usage/logs', { start_hr: weekAgo, end_hr: nowHr }),
      this.safe('/api/v1/usage/host_hour', { start_hr: weekAgo, end_hr: nowHr }),
      this.safe('/api/v2/usage/apm_host_hour', { start_hr: weekAgo, end_hr: nowHr }),
      this.safe('/api/v2/usage/attribution', { month: monthParam, fields: 'custom_metrics' })
    ]);

    const [dashboards, monitors, logIndexes] = await Promise.all([
      this.safe('/api/v1/dashboard'),
      this.safe('/api/v1/monitor', { page_size: 1000 }),
      this.safe('/api/v1/logs/config/indexes')
    ]);

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
      attributionTopMetrics: extractAttributionMetrics(attribution),
      queriedMetricNames: extractQueriedMetrics(dashboards, monitors),
      logIndexes: (logIndexes?.indexes ?? []).map((idx) => ({
        name: idx.name,
        filter: idx.filter?.query ?? '*',
        exclusionFilters: idx.exclusion_filters ?? [],
        retentionDays: idx.num_retention_days ?? 15
      })),
      hosts: [],
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
      out.push({ metric: item.metric_name, seriesCount: item.custom_metrics ?? item.value ?? 0 });
    }
  }
  return out;
}

const METRIC_TOKEN = /\b([a-zA-Z][a-zA-Z0-9_\-\/]*(?:\.[a-zA-Z0-9_\-\/]+)+)\b/g;

export function extractQueriedMetrics(dashboardsRes, monitorsRes) {
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
        if (['q', 'query', 'metric', 'metrics', 'formula', 'expression', 'target'].includes(key)) {
          scanText(String(value));
        }
        walk(value);
      }
    }
  };
  walk(dashboardsRes?.dashboards ?? dashboardsRes ?? []);
  walk(monitorsRes ?? []);
  return found;
}
