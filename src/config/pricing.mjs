export const defaultPricing = {
  currency: 'USD',
  customMetricsIncludedPerHost: 100,
  customMetricsOveragePer100PerMonth: 5,
  infraHostPerMonth: 15,
  apmHostPerMonth: 31,
  logsIngestedPerGb: 0.1,
  logsIndexedPerMillionEvents15d: 1.7,
  spansIndexedPerMillionEvents: 1.7,
  retentionMultipliers: { 15: 1, 30: 2, 45: 3, 60: 4, 90: 6 }
};

export const highCardinalityPatterns = [
  { tag: /(^|_|\.)(id|uuid|guid)$/i, label: 'unique identifiers' },
  { tag: /^customer_?id$/i, label: 'per-customer breakdown' },
  { tag: /^user_?id$/i, label: 'per-user breakdown' },
  { tag: /^session_?id/i, label: 'per-session breakdown' },
  { tag: /^(pod|container|instance)_?(name|id|uid)$/i, label: 'per-pod/container' },
  { tag: /^(request|trace|span)_?id$/i, label: 'per-request' },
  { tag: /^version$|^build_?(hash|sha|id)$/i, label: 'per-build' },
  { tag: /^email$/i, label: 'email as tag' },
  { tag: /^url$|^endpoint$|^path$/i, label: 'full URL/path as tag' }
];

export const confidence = {
  measured: { factor: 0.95, label: 'Measured from usage data' },
  estimated: { factor: 0.75, label: 'Estimated (heuristic)' },
  speculative: { factor: 0.5, label: 'Speculative, verify manually' }
};
