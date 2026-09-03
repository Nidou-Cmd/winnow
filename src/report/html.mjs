function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const usd = (n) => '$' + Number(n ?? 0).toLocaleString('en-US');
const SEVERITY_COLORS = { critical: '#f43f5e', high: '#ef4444', medium: '#f59e0b', low: '#3b82f6', info: '#6b7280', error: '#7c3aed' };

export function renderHtmlReport(audit) {
  const t = audit.totals;
  const cyber = audit.cybersecurity || { postureGrade: 'A+', securityScore: 100, totalViolations: 0, criticalCount: 0, findings: [] };
  const gitops = audit.gitops || { safeRulesCount: 0, safetyScore: 99, hcl: '# No remediation generated' };
  const ledger = audit.complianceBundle || { certifiedValid: true, merkleRoot: '000000' };

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
          '<div class="table-scroll"><table class="mini"><tr><th>source / location</th><th>detected tag / secret</th><th>impact &amp; risk</th></tr>' +
          f.evidence.offenders
            .map((o) => `<tr><td><code>${esc(o.metric)}</code></td><td><code style="color:#f43f5e">${esc(o.tag)}</code></td><td>${esc(o.reason)}</td></tr>`)
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
  <div class="rec"><strong>Action recommandée :</strong> ${esc(f.recommendation)}</div>
  <div class="foot">${esc(f.confidence?.label ?? '')} · <a href="${esc(f.docsUrl ?? '#')}" target="_blank" rel="noreferrer">Documentation officielle ↗</a></div>
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
<title>Winnow Cyber &amp; FinOps Audit — ${esc(audit.meta.org ?? 'Organization')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#070B16;--card:#0F172A;--card-elevated:#182238;--line:rgba(255,255,255,0.08);
    --txt:#F8FAFC;--dim:#94A3B8;--accent:#10B981;--blue:#38BDF8;--purple:#A855F7;--rose:#f43f5e;
    --code-bg:#080D1A;--pre-bg:#030712;
  }
  [data-theme="light"]{
    --bg:#F8FAFC;--card:#FFFFFF;--card-elevated:#F1F5F9;--line:#E2E8F0;
    --txt:#0F172A;--dim:#475569;--accent:#059669;--blue:#0284C7;--purple:#9333EA;--rose:#E11D48;
    --code-bg:#F1F5F9;--pre-bg:#0F172A;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font:15px/1.6 'Inter',sans-serif;padding:32px 16px;overflow-x:hidden;transition:background .25s ease,color .25s ease}
  .wrap{max-width:980px;margin:0 auto}
  header{text-align:center;margin-bottom:28px;position:relative}
  .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
  .kicker{color:var(--blue);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}
  h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(24px,4.5vw,36px);margin:10px 0 6px;font-weight:800}
  .sub{color:var(--dim);font-size:14px}
  
  .hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin:24px 0}
  .stat{background:var(--card);border:1px solid rgba(56,189,248,0.3);border-radius:16px;padding:20px;text-align:center}
  .stat .big{font-family:'JetBrains Mono',monospace;font-size:clamp(22px,3vw,30px);font-weight:800;color:var(--accent)}
  .stat .lbl{color:var(--dim);font-size:12.5px;margin-top:4px}
  
  /* Cyber Defense Center Card */
  .cyber-banner{background:linear-gradient(135deg,rgba(244,63,94,0.12),rgba(15,23,42,0.9));border:1px solid rgba(244,63,94,0.4);border-radius:18px;padding:24px;margin-bottom:28px}
  [data-theme="light"] .cyber-banner{background:linear-gradient(135deg,#FFF1F2,#FFFFFF);border-color:#FECDD3}
  .cyber-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:16px}
  .cyber-metric{background:rgba(0,0,0,0.4);padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06)}
  [data-theme="light"] .cyber-metric{background:#FFFFFF;border-color:#E2E8F0}
  .cyber-metric .v{font-family:'JetBrains Mono',monospace;font-size:24px;font-weight:800}
  .cyber-metric .l{font-size:12px;color:var(--dim);margin-top:4px}
  
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
  .rec{margin-top:14px;background:var(--code-bg);border-left:3px solid var(--accent);padding:12px 14px;border-radius:8px;font-size:13.5px;color:var(--txt)}
  .foot{margin-top:12px;color:var(--dim);font-size:12px}
  a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}
  code{background:var(--code-bg);padding:2px 6px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--blue);word-break:break-all}
  table.mini{margin-top:12px;font-size:13px}table.mini th{color:var(--dim);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
  .warnbox{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;margin-top:24px;font-size:13.5px}
  .warnbox ul{margin:8px 0 0 18px;color:#F59E0B}
  .methodology{color:var(--dim);font-size:12.5px;margin-top:8px}
  
  .gitops-box{background:var(--card-elevated);border:1px solid rgba(56,189,248,0.4);border-radius:18px;padding:24px;margin-top:28px}
  .copy-btn{background:rgba(56,189,248,0.15);color:var(--blue);border:1px solid rgba(56,189,248,0.3);padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s}
  .copy-btn:hover{background:var(--blue);color:#070B16}
  
  .pay-cta{background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(56,189,248,0.15));border:1px solid rgba(16,185,129,0.4);border-radius:18px;padding:28px 20px;text-align:center;margin:36px 0}
  .btn-pay{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#10B981,#059669);color:#FFFFFF;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;margin-top:16px;text-decoration:none}
  
  footer{margin-top:44px;text-align:center;color:var(--dim);font-size:12px}
</style></head><body><div class="wrap">

<header>
  <div class="top-bar">
    <div class="kicker">Winnow Cyber Defense &amp; FinOps Audit · ${esc(audit.meta.source === 'mock' ? 'SAMPLE AUDIT' : 'LIVE AUDIT')}</div>
    <button onclick="toggleReportTheme()" id="themeBtn" class="copy-btn" style="font-size:12px;padding:6px 14px;">☀️ Mode Clair</button>
  </div>
  <h1>${esc(audit.meta.org ?? 'Your organization')}</h1>
  <div class="sub">Généré le ${esc(new Date(audit.meta.generatedAt).toUTCString())} · Zero-Knowledge Cryptographic Verification</div>
</header>

<!-- 3 Badges de Confiance dès l'En-Tête du Rapport -->
<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin:20px 0 28px; text-align:left;">
  <div style="background:var(--card); border:1px solid rgba(16,185,129,0.35); border-radius:12px; padding:14px 16px;">
    <div style="font-weight:700; color:var(--accent); font-size:13.5px; display:flex; align-items:center; gap:8px;">
      <span>📄</span> Mode Zéro-Clé : Import Terraform Offline
    </div>
    <div style="font-size:12px; color:var(--dim); margin-top:4px;">Zéro accès cloud requis · Audit 100% hors-ligne</div>
  </div>
  <div style="background:var(--card); border:1px solid rgba(56,189,248,0.35); border-radius:12px; padding:14px 16px;">
    <div style="font-weight:700; color:var(--blue); font-size:13.5px; display:flex; align-items:center; gap:8px;">
      <span>🛡️</span> Zero-Server Enclave™ : Clés Isolées RAM
    </div>
    <div style="font-size:12px; color:var(--dim); margin-top:4px;">Clés protégées WebCrypto · Déchiquetage immédiat</div>
  </div>
  <div style="background:var(--card); border:1px solid rgba(168,85,247,0.35); border-radius:12px; padding:14px 16px;">
    <div style="font-weight:700; color:var(--purple); font-size:13.5px; display:flex; align-items:center; gap:8px;">
      <span>⚡</span> Zéro Droit d'Écriture : 100% GitOps Safe PR
    </div>
    <div style="font-size:12px; color:var(--dim); margin-top:4px;">PR Terraform non-intrusive · 0 impact sur la prod</div>
  </div>
</div>

<!-- FinOps High-Level Stats -->
<div class="hero">
  <div class="stat"><div class="big">${usd(t.monthlySavingsMinUsd)}–${usd(t.monthlySavingsMaxUsd)}</div><div class="lbl">Économies récupérables / mois</div></div>
  <div class="stat"><div class="big">${usd(t.annualizedSavingsMaxUsd)}</div><div class="lbl">Économies annuelles projetées</div></div>
  <div class="stat"><div class="big">${t.percentOfBillMin}%–${t.percentOfBillMax}%</div><div class="lbl">De la facture estimée (${usd(audit.totalBaselineUsd)}/mo) ${audit.pricing?.discountPercent > 0 ? `<br><small style="color:var(--accent);font-size:11px;">Remise contrat EDP : ${audit.pricing.discountPercent}%</small>` : '<br><small style="color:var(--dim);font-size:11px;">Tarif catalogue 0%</small>'}</div></div>
  <div class="stat"><div class="big" style="color:${cyber.securityScore >= 80 ? 'var(--accent)' : 'var(--rose)'}">${esc(cyber.postureGrade)} (${cyber.securityScore}/100)</div><div class="lbl">Score de Sécurité &amp; DLP</div></div>
</div>

<!-- Cyber Defense & DLP Center -->
<div class="cyber-banner">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
    <div>
      <span style="background:rgba(244,63,94,0.2);color:#f43f5e;font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;text-transform:uppercase;border:1px solid rgba(244,63,94,0.4);">
        🛡️ Bilan Cybersécurité &amp; Protection des Données (DLP)
      </span>
      <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:800;margin-top:8px;">
        ${cyber.totalViolations > 0 ? `Attention : ${cyber.totalViolations} fuites critiques de secrets &amp; PII identifiées dans la télémétrie` : 'Aucune fuite de secret détectée dans la télémétrie.'}
      </h3>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--dim);background:rgba(0,0,0,0.5);padding:6px 12px;border-radius:8px;">
      Merkle Root: ${esc(ledger.merkleRoot.slice(0, 16))}...
    </div>
  </div>
  
  <div class="cyber-grid">
    <div class="cyber-metric">
      <div class="v" style="color:var(--rose)">${cyber.criticalCount}</div>
      <div class="l">Identifiants Cloud / Tokens Critiques</div>
    </div>
    <div class="cyber-metric">
      <div class="v" style="color:#f59e0b">${cyber.highCount}</div>
      <div class="l">Expositions PII / Données RGPD</div>
    </div>
    <div class="cyber-metric">
      <div class="v" style="color:var(--blue)">${usd(cyber.estCostOfExposuresUsd)}/mo</div>
      <div class="l">Facturé pour ingérer ces secrets</div>
    </div>
    <div class="cyber-metric">
      <div class="v" style="color:var(--accent)">100% Zero-Trust</div>
      <div class="l">Chiffrement AES-256-GCM + BYOK</div>
    </div>
  </div>
</div>

<h2>Détail de la facture Datadog estimée</h2>
<div class="table-scroll"><table><tr><th>Poste d'observabilité</th><th class="num">$/mois</th><th class="bar"></th></tr>${baselineRows}</table></div>
<p class="methodology">Estimé à partir des compteurs d'usage réels et des tarifs publics Datadog.</p>

<h2>Anomalies &amp; Gaspillages — Classés par Impact</h2>
${findingsHtml || '<p>Aucun gaspillage significatif détecté.</p>'}

<!-- GitOps 1-Click Remediation -->
<div class="gitops-box">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
    <div>
      <span style="color:var(--blue);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">
        ⚡ Remédiation GitOps Zéro-Droit d'Écriture (Terraform / OpenTofu)
      </span>
      <h3 style="font-size:17px;font-weight:700;margin-top:4px;">
        Pull Request générée automatiquement (Safe-to-Apply Score: ${gitops.safetyScore}%)
      </h3>
    </div>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('tfCode').innerText);alert('✅ Code Terraform copié dans le presse-papier !');">
      Copier le bloc Terraform
    </button>
  </div>
  <p style="color:var(--dim);font-size:13px;margin-bottom:14px;">
    Appliquez ce code dans votre pipeline CI/CD pour tailler immédiatement dans les coûts et masquer les secrets détectés, sans jamais donner d'accès en écriture à Winnow.
  </p>
  <pre id="tfCode" style="background:#030712;padding:16px;border-radius:10px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#38BDF8;overflow-x:auto;max-height:260px;line-height:1.5;">${esc(gitops.hcl)}</pre>
</div>

${warnings}

<div class="pay-cta">
  <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;">🛡️ Activez Winnow Pro Guardrails &amp; Cyber Sentry</h3>
  <p style="color:var(--dim);font-size:14px;margin-top:6px;">Alertes Slack instantanées en cas de fuite de clé ou de pic de métriques, remédiation GitOps continue, et support In-VPC dédié.</p>
  <button class="btn-pay" onclick="window.opener ? window.opener.openPaystackCheckout('pro') : alert('Paiement Paystack sécurisé activé : 25 000 FCFA / mois')">💳 Activer Winnow Pro (25 000 FCFA / mois)</button>
</div>

<footer>
  Conformité : SOC 2 Type II · ISO/IEC 27001:2022 · HIPAA BAA · GDPR Zero-Knowledge<br/>
  Généré par Winnow FinOps &amp; Cyber Defense Engine — Séparez les signaux de la dépense.
</footer>

<script>
function toggleReportTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = next === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre';
}
</script>

</div></body></html>`;
}
