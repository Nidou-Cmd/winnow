export function buildDemoSnapshot() {
  const attributionTopMetrics = [
    { metric: 'app.checkout.abandoned_cart_value', seriesCount: 2400, tags: ['env:prod', 'service:checkout', 'customer_id:usr_98124', 'user_email:customer.checkout@example.com'] },
    { metric: 'app.http.request_duration', seriesCount: 2000, tags: ['env:prod', 'service:api', 'route:/v1/pay', 'auth_header:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0.s3cr3ts1gn4tur3'] },
    { metric: 'app.search.query_length_ms', seriesCount: 1800, tags: ['env:prod', 'service:search', 'cloud_key:AKIAIOSFODNN7EXAMPLE'] },
    { metric: 'kubernetes.pod.cpu_usage', seriesCount: 1400, tags: ['env', 'pod_name', 'node'] },
    { metric: 'app.queue.depth_by_partition', seriesCount: 1500, tags: ['env', 'partition_id'] },
    { metric: 'trace.redis.command_duration', seriesCount: 1000, tags: ['env', 'service'] },
    { metric: 'worker.job.retry_count_v2', seriesCount: 900, tags: ['env', 'worker'] },
    { metric: 'db.pool.active_connections', seriesCount: 600, tags: ['env', 'db'] },
    { metric: 'app.feature_flags.eval_total', seriesCount: 700, tags: ['env', 'flag'] },
    { metric: 'cache.hit_ratio_by_node', seriesCount: 600, tags: ['node_id', 'region'] },
    { metric: 'app.session.duration_seconds', seriesCount: 500, tags: ['session_id'] },
    { metric: 'system.memory.used_pct', seriesCount: 500, tags: ['host'] },
    { metric: 'api.request.size_bytes_legacy', seriesCount: 400, tags: ['env'] },
    { metric: 'app.orders.created_total', seriesCount: 800, tags: ['env', 'country'] },
    { metric: 'app.experiment.variant_exposure', seriesCount: 350, tags: ['experiment_id', 'variant'] },
    { metric: 'app.auth.login_attempts', seriesCount: 300, tags: ['env'] },
    { metric: 'payments.gateway.latency_ms_deprecated', seriesCount: 300, tags: ['gateway'] },
    { metric: 'app.payments.success_rate', seriesCount: 400, tags: ['env', 'gateway'] }
  ];

  const queriedMetricNames = new Set([
    'app.http.request_duration',
    'kubernetes.pod.cpu_usage',
    'trace.redis.command_duration',
    'db.pool.active_connections',
    'system.memory.used_pct',
    'app.orders.created_total',
    'app.auth.login_attempts',
    'app.payments.success_rate',
    'system.cpu.user',
    'datadog.estimated_usage.metrics.custom'
  ]);

  return {
    meta: {
      org: 'acme-demo (sample data)',
      site: 'datadoghq.com',
      generatedAt: new Date().toISOString(),
      source: 'mock',
      month: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)
    },
    usage: {
      customMetricsTotal: 28000,
      infraHostsAvg: 120,
      apmHostsAvg: 80,
      logsIngestedGb: 900,
      logsIndexedEvents: 420_000_000,
      spansIndexedEvents: 180_000_000,
      otherMonthlySpendUsd: 1200,
      attributionAvailable: true
    },
    metrics: [],
    attributionTopMetrics,
    queriedMetricNames,
    logIndexes: [
      {
        name: 'prod-main',
        filter: '*',
        exclusionFilters: [],
        retentionDays: 30,
        eventShare: 0.55
      },
      {
        name: 'prod-debug',
        filter: 'service:checkout OR service:search',
        exclusionFilters: [],
        retentionDays: 30,
        eventShare: 0.4,
        neverQueriedSources: ['debug', 'trace-dump']
      },
      {
        name: 'errors-critical',
        filter: 'status:(error OR critical)',
        exclusionFilters: [{ name: 'healthchecks', query: 'url:/health' }],
        retentionDays: 15,
        eventShare: 0.03
      },
      {
        name: 'security-audit',
        filter: 'source:auditd',
        exclusionFilters: [{ name: 'noise', query: '-event:cron' }],
        retentionDays: 90,
        eventShare: 0.02,
        complianceRequired: true
      }
    ],
    hosts: [
      { name: 'stg-node-01..stg-node-14', env: 'staging', count: 14, monitoredHoursPerWeek: 168 }
    ],
    warnings: []
  };
}
