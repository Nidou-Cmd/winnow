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
          '<div class="table-scroll"><table class="mini"><tr><th>metric</th><th class="num">billable series</th></tr>' +
          f.evidence.topOffenders
            .map((o) => `<tr><td><code>${esc(o.metric)}</code></td><td class="num">${Number(o.series).toLocaleString()}</td></tr>`)
            .join('') +
          '</table></div>';
      } else if (f.evidence?.offenders) {
        evidenceHtml =
          '<div class="table-scroll"><table class="mini"><tr><th>metric</th><th>tag</th><th>why it hurts</th></tr>' +
          f.evidence.offenders
            .map((o) => `<tr><td><code>${esc(o.metric)}</code></td><td><code>${esc(o.tag)}</code></td><td>${esc(o.reason)}</td></tr>`)
            .join('') +
          '</table></div>';
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
  <div class="rec"><strong>Fix Recommended:</strong> ${esc(f.recommendation)}</div>
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
<html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5.0"/>
<title>Observability Cost Audit — ${esc(audit.meta.org ?? 'Organization')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root{--bg:#070B16;--card:#0F172A;--line:rgba(255,255,255,0.08);--txt:#F8FAFC;--dim:#94A3B8;--accent:#10B981;--blue:#38BDF8}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font:15px/1.6 'Inter',sans-serif;padding:32px 16px;overflow-x:hidden}
  .wrap{max-width:940px;margin:0 auto}
  header{text-align:center;margin-bottom:32px}
  .kicker{color:var(--blue);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}
  h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(24px,4.5vw,36px);margin:10px 0 6px;font-weight:800}
  .sub{color:var(--dim);font-size:14px}
  .hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:28px 0}
  .stat{background:var(--card);border:1px solid rgba(56,189,248,0.3);border-radius:16px;padding:20px;text-align:center}
  .stat .big{font-family:'JetBrains Mono',monospace;font-size:clamp(22px,3vw,30px);font-weight:800;color:var(--accent)}
  .stat .lbl{color:var(--dim);font-size:12.5px;margin-top:4px}
  h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:700;margin:32px 0 14px;border-bottom:1px solid var(--line);padding-bottom:8px}
  .table-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  table{width:100%;border-collapse:collapse;min-width:480px}
  td,th{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;font-size:13.5px}
  td.num,th.num{text-align:right;font-family:'JetBrains Mono',monospace}
  .bar{width:30%}.bar span{display:block;height:8px;background:linear-gradient(90deg,#10B981,#38BDF8);border-radius:4px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin-bottom:16px}
  .card-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .card-head h3{flex:1;font-size:16.5px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:700}
  .save{color:var(--accent);font-family:'JetBrains Mono',monospace;font-weight:700;white-space:nowrap}.save small{color:var(--dim);font-weight:400}
  .sev{font-size:10px;font-weight:800;color:#070B16;border-radius:99px;padding:4px 10px;letter-spacing:.06em}
  .desc{color:var(--dim);margin-top:10px;font-size:14px}
  .rec{margin-top:14px;background:#080D1A;border-left:3px solid var(--accent);padding:12px 14px;border-radius:8px;font-size:13.5px;color:#E2E8F0}
  .foot{margin-top:12px;color:var(--dim);font-size:12px}
  a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}
  code{background:#080D1A;padding:2px 6px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue);word-break:break-all}
  table.mini{margin-top:12px;font-size:13px}table.mini th{color:var(--dim);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
  .warnbox{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;margin-top:24px;font-size:13.5px}
  .warnbox ul{margin:8px 0 0 18px;color:#FCD34D}
  .methodology{color:var(--dim);font-size:12.5px;margin-top:8px}
  
  .pay-cta{background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(56,189,248,0.15));border:1px solid rgba(16,185,129,0.4);border-radius:18px;padding:28px 20px;text-align:center;margin:36px 0}
  .btn-pay{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#10B981,#059669);color:#04120C;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;margin-top:16px;text-decoration:none}
  
  footer{margin-top:44px;text-align:center;color:var(--dim);font-size:12px}
  @media(max-width:600px){
    body{padding:20px 12px}
    .card{padding:16px}
    .card-head{flex-direction:column;align-items:flex-start}
    .save{align-self:flex-start;margin-top:4px}
  }
</style></head><body><div class="wrap">

<header>
  <div class="kicker">Winnow Cost Audit Report · ${esc(audit.meta.source === 'mock' ? 'SAMPLE AUDIT' : 'LIVE AUDIT')} · ${esc(audit.meta.month)}</div>
  <h1>${esc(audit.meta.org ?? 'Your organization')}</h1>
  <div class="sub">Generated ${esc(new Date(audit.meta.generatedAt).toUTCString())}</div>
</header>

<div class="hero">
  <div class="stat"><div class="big">${usd(t.monthlySavingsMinUsd)}–${usd(t.monthlySavingsMaxUsd)}</div><div class="lbl">recoverable / month</div></div>
  <div class="stat"><div class="big">${usd(t.annualizedSavingsMaxUsd)}</div><div class="lbl">projected annual savings</div></div>
  <div class="stat"><div class="big">${t.percentOfBillMin}%–${t.percentOfBillMax}%</div><div class="lbl">of estimated bill (${usd(audit.totalBaselineUsd)}/mo)</div></div>
</div>

<h2>Where your bill comes from (estimated)</h2>
<div class="table-scroll"><table><tr><th>Meter</th><th class="num">$/month</th><th class="bar"></th></tr>${baselineRows}</table></div>
<p class="methodology">Estimated from Datadog list prices × measured usage meters. Your contract may differ; the exact invoice always wins.</p>

<h2>Findings — ranked by financial impact</h2>
${findingsHtml || '<p>No significant waste detected. Your setup is clean or data sources were unavailable.</p>'}

${warnings}

<div class="pay-cta">
  <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;">🚀 Automatisez la Suppression du Gaspillage Datadog</h3>
  <p style="color:var(--dim);font-size:14px;margin-top:6px;">Activez Winnow Pro Guardrails pour recevoir des alertes Slack automatiques avant chaque facture et supprimer les métriques orphelines.</p>
  <button class="btn-pay" onclick="window.opener ? window.opener.openPaystackCheckout('pro') : alert('Paiement Paystack sécurisé activé : 25 000 FCFA / mois')">💳 Activer Winnow Pro (25 000 FCFA / mois)</button>
</div>

<footer>
  Methodology &amp; pricing assumptions are configurable (<code>src/config/pricing.mjs</code>).<br/>
  This report reads metadata only — no log contents leave your Datadog org.<br/>
  Generated by Winnow v0.1 — separate the signals from the spend
</footer>

</div></body></html>`;
}
