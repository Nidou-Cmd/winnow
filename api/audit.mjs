import { readJsonBody, runAuditFromBody } from '../src/web/audit-handler.mjs';

export const maxDuration = 60;

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_CnCZpd7o_JkiESUd8gMKvuH32TQsmi5Ef";
const ADMIN_EMAILS = ["nidhal.najjar3@gmail.com", "najjar.nidhal@gmail.com", "nidhal.najjar@gmail.com", "rahmamili2016@gmail.com"];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST with JSON body {"mode":"mock"} or credentials' });
    return;
  }
  try {
    const body = await readJsonBody(req);
    const result = await runAuditFromBody(body);

    const email = String(body.email || body.leadEmail || "").trim().toLowerCase();
    const company = String(body.company || body.org || "Organisation Cloud").trim();
    const minSave = Math.round(result.totals?.monthlySavingsMinUsd || 0);
    const maxSave = Math.round(result.totals?.monthlySavingsMaxUsd || 0);
    const annualSave = Math.round((minSave + maxSave) / 2 * 12);

    const reportHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; color: #f8fafc; padding: 30px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #10b981; margin: 0; font-size: 24px;">⚡ Winnow FinOps — Rapport d'Audit des Coûts Cloud</h1>
        <p style="color: #94a3b8; font-size: 14px;">Analyse d'optimisation d'infrastructure pour <strong>${company}</strong></p>
      </div>

      <div style="background: #111827; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10b981;">
        <h2 style="margin-top: 0; font-size: 18px; color: #e2e8f0;">💰 Économies Identifiées : $${minSave.toLocaleString()} - $${maxSave.toLocaleString()} / mois</h2>
        <p style="color: #34d399; font-size: 16px; font-weight: bold;">Soit environ ~$${annualSave.toLocaleString()} d'économies annuelles détectées.</p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Principales fuites budgétaires analysées :
        </p>
        <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
          <li><strong>Métriques personnalisées orphelines :</strong> Indexation non rentabilisée</li>
          <li><strong>Logs non filtrés / Verbosité excessive :</strong> Rétention coûteuse</li>
          <li><strong>Conteneurs et APM inactifs :</strong> Facturation de bande passante inutile</li>
        </ul>
      </div>

      <div style="background: #111827; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="margin-top: 0; font-size: 16px; color: #10b981;">👉 Accéder à votre rapport interactif & Snippets Terraform :</h3>
        <p style="margin-bottom: 15px; font-size: 14px; color: #94a3b8;">Consultez les correctifs de code prêts à déployer :</p>
        <a href="https://winnowcost.com/?company=${encodeURIComponent(company)}" style="display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Consulter le Rapport Winnow ➔</a>
      </div>

      <div style="text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #1f2937; padding-top: 15px;">
        <p>Winnow FinOps Labs • Optimisation d'Infrastructure & Télémétrie</p>
        <p>Questions ? Répondez directement à cet email pour un échange avec nos ingénieurs.</p>
      </div>
    </div>
    `;

    // 1. Envoyer au prospect s'il a renseigné son email
    if (email && email.includes('@')) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Winnow FinOps <audit@winnowcost.com>",
            to: [email],
            subject: `⚡ Votre Rapport d'Audit FinOps Datadog & Cloud (${company})`,
            html: reportHtml,
          }),
        });
      } catch (e) {
        console.error("Erreur envoi email prospect Winnow:", e);
      }
    }

    // 2. Toujours envoyer une copie complète à l'Administrateur
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Winnow FinOps <audit@winnowcost.com>",
          to: ADMIN_EMAILS,
          subject: `🎯 [NOUVEL AUDIT WINNOW] $${annualSave.toLocaleString()}/an pour ${company} (${email || 'Web Direct'})`,
          html: `<p><strong>Un nouvel audit de coûts cloud a été généré sur Winnow !</strong></p><p>Entreprise: <code>${company}</code><br/>Email: <code>${email || 'Non renseigné'}</code><br/>Économies détectées: <strong>$${minSave} - $${maxSave}/mois</strong> (~$${annualSave}/an)</p><hr/>` + reportHtml,
        }),
      });
    } catch (e) {
      console.error("Erreur envoi email admin Winnow:", e);
    }

    // 3. Send instant Telegram notification
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "8722641204:AAHaMcHVMbNoBygqQdknuWIn14FceYu0e1w";
      const chatId = process.env.TELEGRAM_CHAT_ID || "7561160994";
      if (telegramToken && chatId) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎯 *NOUVEL AUDIT WINNOW EXPÉDIÉ PAR EMAIL !*\n\n🏢 *Entreprise:* \`${company}\`\n📧 *Email:* \`${email || 'Web'}\`\n💰 *Économies estimées:* $${minSave}–$${maxSave}/mois (~$${annualSave}/an)\n📬 *Rapports Expédiés:* ✅ (Prospect + 4 Admins)`,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (e) {}

    res.status(200).json(result);
  } catch (err) {
    res.status(err.status ?? (String(err.message).includes('required') ? 400 : 500)).json({ error: err.message });
  }
}
