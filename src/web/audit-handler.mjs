import { buildDemoSnapshot } from '../mock/fixtures.mjs';
import { DatadogClient } from '../datadog/client.mjs';
import { createPricing } from '../config/pricing.mjs';
import { runAudit } from '../engine/engine.mjs';
import { renderHtmlReport } from '../report/html.mjs';

export async function readJsonBody(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export async function runAuditFromBody(body) {
  const requiredPassword = process.env.SITE_PASSWORD;
  if (requiredPassword && body.sitePassword !== requiredPassword && body.password !== requiredPassword) {
    throw Object.assign(new Error("🔒 Accès restreint. Mot de passe d'accès requis pendant la phase de configuration."), { status: 401 });
  }

  let snapshot;
  if (body.mode === 'mock') {
    snapshot = buildDemoSnapshot();
  } else {
    const client = new DatadogClient({
      apiKey: String(body.apiKey ?? ''),
      appKey: String(body.appKey ?? ''),
      site: String(body.site ?? 'datadoghq.com')
    });
    snapshot = await client.collectAll();
  }
  const pricing = createPricing({
    discountPercent: body.discountPercent ?? body.discount ?? 0,
    overrides: body.pricing ?? {}
  });
  const audit = runAudit(snapshot, pricing);
  return {
    totals: audit.totals,
    findings: audit.findings.map((f) => ({ title: f.title, severity: f.severity })),
    warnings: audit.warnings,
    html: renderHtmlReport(audit)
  };
}
