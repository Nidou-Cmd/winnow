function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const usd = (n) => '$' + Number(n ?? 0).toLocaleString('en-US');
const SEVERITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6', info: '#6b7280', error: '#7c3aed' };

export function renderHtmlReport(audit) {
  const t = audit.totals;

  const findingsHtml = audit.findings
    .map((f) => {
      const color = SEVERITY_COLORS[f.severity] ?? '#6b7280';
      let evidenceHtml = '';
      if (f.evidence?.topOffenders) {
        evidenceHtml =
          '<table class="mini"><tr><th>metric</th><th class="num">billable series</th></tr>' +
          f.evidence.topOffenders
            .map((o) => `<tr><td><code>${esc(o.metric)}</code></td><td class="num">${Number(o.series).toLocaleString()}</td></tr>`)
            .join('') +
          '</table>';
      } else if (f.evidence?.offenders) {
        evidenceHtml =
          '<table class="mini"><tr><th>metric</th><th>tag</th><th>why it hurts</th></tr>' +
          f.evidence.offenders
            .map((o) => `<tr><td><code>${esc(o.metric)}</code></td><td><code>${esc(o.tag)}</code></td><td>${esc(o.reason)}</td></tr>`)
            .join('') +
          '</table>';
      } else if (f.evidence?.groups) {
        evidenceHtml =
          '<p class="desc">Detected: ' + f.evidence.groups.map((g) => `${esc(g.env)} × ${g.hosts} hosts`).join(' · ') + '</p>';
      }
      return `<div class="card">
  <div class="card-head">
    <span class="sev" style="background:${color}">${esc(String(f.severity).toUpperCase())}</span>
    <h3>${esc(f.title)}</h3>
    <span class="save">${usd(f.estMonthlySavingsMin)} – ${usd(f.estMonthlySavingsMax)}<small>/mo</small></span>
  </div>
  <p class="desc">${esc(f.description)}</p>
  ${evidenceHtml}
  <div class="rec"><strong>Fix:</strong> ${esc(f.recommendation)}</div>
  <div class="foot">${esc(f.confidence?.label ?? '')} · <a href="${esc(f.docsUrl ?? '#')}" target="_blank" rel="noreferrer">Datadog docs ↗</a></div>
</div>`;
    })
    .join('\n');

  const LABELS = {
    customMetricsOverage: 'Custom metrics overage',
    infra: 'Infrastructure hosts',
    apm: 'APM hosts',
    logsIngest: 'Log ingestion',
    logsIndexed: 'Log indexing & retention',
    apmSpans: 'APM span retention',
    other: 'Other products'
  };
  const baselineRows = Object.entries(audit.baseline)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const pct = Math.max(2, Math.round((v / audit.totalBaselineUsd) * 100));
      return `<tr><td>${LABELS[k] ?? esc(k)}</td><td class="num">${usd(v)}</td><td class="bar"><span style="width:${pct}%"></span></td></tr>`;
    })
    .join('');

  const warnings = audit.warnings.length
    ? `<div class="warnbox"><strong>Data coverage warnings</strong><ul>${audit.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Observability Cost Audit — ${esc(audit.meta.org ?? 'Organization')}</title>
<style>
  :root{--bg:#0b1020;--card:#121a33;--line:#22305c;--txt:#e5ecff;--dim:#93a4cc;--accent:#34d399}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font:15px/1.55 -apple-system,'Segoe UI',Roboto,sans-serif;padding:40px 20px}
  .wrap{max-width:900px;margin:0 auto}
  header{text-align:center;margin-bottom:36px}
  .kicker{color:var(--dim);text-transform:uppercase;letter-spacing:.18em;font-size:12px}
  h1{font-size:30px;margin:10px 0 4px}
  .sub{color:var(--dim)}
  .hero{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin:28px 0}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 28px;text-align:center;min-width:180px}
  .stat .big{font-size:32px;font-weight:700;color:var(--accent)}
  .stat .lbl{color:var(--dim);font-size:13px;margin-top:4px}
  h2{font-size:19px;margin:34px 0 12px;border-bottom:1px solid var(--line);padding-bottom:8px}
  table{width:100%;border-collapse:collapse}
  td,th{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;font-size:14px}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .bar{width:38%}.bar span{display:block;height:8px;background:linear-gradient(90deg,#34d399,#60a5fa);border-radius:4px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 24px;margin-bottom:18px}
  .card-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .card-head h3{flex:1;font-size:16px}
  .save{color:var(--accent);font-weight:700;white-space:nowrap}.save small{color:var(--dim);font-weight:400}
  .sev{font-size:10px;font-weight:800;color:#0b1020;border-radius:99px;padding:3px 9px;letter-spacing:.06em}
  .desc{color:var(--dim);margin-top:10px}
  .rec{margin-top:12px;background:#0e1730;border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;font-size:14px}
  .foot{margin-top:10px;color:var(--dim);font-size:12px}
  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}
  code{background:#0e1730;padding:1px 6px;border-radius:4px;font-size:12.5px;color:#a5b8ff}
  table.mini{margin-top:12px;font-size:13px}table.mini th{color:var(--dim);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
  .warnbox{background:#2a1f0e;border:1px solid #59431f;border-radius:10px;padding:14px 18px;margin-top:26px;font-size:13.5px}
  .warnbox ul{margin:8px 0 0 18px;color:#e8c987}
  .methodology{color:var(--dim);font-size:13px;margin-top:8px}
  footer{margin-top:44px;text-align:center;color:var(--dim);font-size:12px}
</style></head><body><div class="wrap">

<header>
  <div class="kicker">Telemetry Cost Audit · ${esc(audit.meta.source === 'mock' ? 'SAMPLE DATA' : 'LIVE DATA')} · ${esc(audit.meta.month)}</div>
  <h1>${esc(audit.meta.org ?? 'Your organization')}</h1>
  <div class="sub">Generated ${esc(new Date(audit.meta.generatedAt).toUTCString())}</div>
</header>

<div class="hero">
  <div class="stat"><div class="big">${usd(t.monthlySavingsMinUsd)}–${usd(t.monthlySavingsMaxUsd)}</div><div class="lbl">recoverable / month</div></div>
  <div class="stat"><div class="big">${usd(t.annualizedSavingsMaxUsd)}</div><div class="lbl">projected annual savings</div></div>
  <div class="stat"><div class="big">${t.percentOfBillMin}%–${t.percentOfBillMax}%</div><div class="lbl">of estimated bill (${usd(audit.totalBaselineUsd)}/mo)</div></div>
</div>

<h2>Where your bill comes from (estimated)</h2>
<table><tr><th>Meter</th><th class="num">$/month</th><th class="bar"></th></tr>${baselineRows}</table>
<p class="methodology">Estimated from Datadog list prices × measured usage meters. Your contract may differ (committed-use discounts); the exact invoice always wins.</p>

<h2>Findings — ranked by impact</h2>
${findingsHtml || '<p>No significant waste detected. Either your setup is clean or some data sources were unavailable.</p>'}

${warnings}

<footer>
  Methodology &amp; pricing assumptions are configurable (<code>src/config/pricing.mjs</code>).<br/>
  This report reads metadata only — no log contents leave your Datadog org.<br/>
  Generated by telemetry-cost-audit v0.1
</footer>

</div></body></html>`;
}
