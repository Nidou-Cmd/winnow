export const defaultPricing = {
  currency: 'USD',
  customMetricsIncludedPerHost: 100,
  customMetricsOveragePer100PerMonth: 5,
  infraHostPerMonth: 15,
  apmHostPerMonth: 31,
  logsIngestedPerGb: 0.1,
  logsIndexedPerMillionEvents15d: 1.7,
  spansIndexedPerMillionEvents: 1.7,
  retentionMultipliers: { 15: 1, 30: 2, 45: 3, 60: 4, 90: 6 },
  discountPercent: 0
};

export function createPricing({ discountPercent = 0, overrides = {} } = {}) {
  const discount = Math.max(0, Math.min(90, Number(discountPercent) || 0));
  const factor = 1 - discount / 100;
  return {
    ...defaultPricing,
    customMetricsOveragePer100PerMonth: Math.round(defaultPricing.customMetricsOveragePer100PerMonth * factor * 100) / 100,
    infraHostPerMonth: Math.round(defaultPricing.infraHostPerMonth * factor * 100) / 100,
    apmHostPerMonth: Math.round(defaultPricing.apmHostPerMonth * factor * 100) / 100,
    logsIngestedPerGb: Math.round(defaultPricing.logsIngestedPerGb * factor * 1000) / 1000,
    logsIndexedPerMillionEvents15d: Math.round(defaultPricing.logsIndexedPerMillionEvents15d * factor * 100) / 100,
    spansIndexedPerMillionEvents: Math.round(defaultPricing.spansIndexedPerMillionEvents * factor * 100) / 100,
    ...overrides,
    discountPercent: discount
  };
}

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
