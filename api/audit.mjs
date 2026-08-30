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
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #0b0f19; color: #f8fafc; padding: 32px; border-radius: 14px; border: 1px solid #1f2937;">
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="background: #059669; color: #ffffff; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">⚡ Winnow FinOps • Rapport d'Économies Cloud</span>
        <h1 style="color: #10b981; margin: 12px 0 4px 0; font-size: 24px; font-weight: 800;">Audit FinOps Datadog & Télémétrie</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Analyse d'infrastructure générée pour <strong>${company}</strong></p>
      </div>

      <!-- SYNTHÈSE ÉCONOMIES -->
      <div style="background: #111827; padding: 22px; border-radius: 10px; margin-bottom: 22px; border-left: 4px solid #10b981;">
        <h2 style="margin-top: 0; font-size: 18px; color: #e2e8f0;">💰 Économies Détectées : $${minSave.toLocaleString()} - $${maxSave.toLocaleString()} / mois</h2>
        <p style="color: #34d399; font-size: 16px; font-weight: bold; margin: 6px 0 12px 0;">Soit jusqu'à ~$${annualSave.toLocaleString()} d'économies annuelles identifiées.</p>
        <ul style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li><strong>Métriques Personnalisées Orphelines :</strong> Séries non interrogées à purger</li>
          <li><strong>Rétention de Logs Excessive :</strong> Ingestion brute optimisable de 30%+</li>
          <li><strong>Conteneurs Inactifs & APM :</strong> Monitoring continu sur des workloads dormants</li>
        </ul>
      </div>

      <!-- 🔥 BANNIÈRE OFFRE SPÉCIALE LANCEMENT -50% 🔥 -->
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%); border: 2px solid #10b981; border-radius: 12px; padding: 22px; margin: 25px 0; text-align: center;">
        <span style="background: #059669; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">🔥 Offre Spéciale Lancement • -50% Immédiat</span>
        <h3 style="color: #ffffff; margin: 12px 0 6px 0; font-size: 19px; font-weight: bold;">Déployez les Correctifs Terraform à Moitié Prix</h3>
        <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 14px 0; line-height: 1.5;">
          Obtenez les scripts d'application 1-clic et le support ingénieur avec <strong>50% de réduction</strong> grâce au code promo :
          <span style="background: #111827; color: #34d399; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; border: 1px dashed #10b981;">FOUNDER50</span>
        </p>
        <div style="background: rgba(11, 15, 25, 0.8); border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 12px; color: #94a3b8;">
          ⏳ <em>Offre exclusive de lancement — Valable jusqu'au <strong>7 Novembre 2026 à 23h59 UTC</strong></em>
        </div>
        <a href="https://winnowcost.com/?company=${encodeURIComponent(company)}&promo=FOUNDER50" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          ⚡ Appliquer -50% & Déployer les Économies ➔
        </a>
      </div>

      <div style="text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #1f2937; padding-top: 18px; margin-top: 25px;">
        <p style="margin: 0 0 5px 0;">Winnow FinOps Labs • Optimisation d'Infrastructure & Télémétrie Cloud</p>
        <p style="margin: 0;">Besoin d'un accompagnement personnalisé ? Répondez directement à cet email.</p>
      </div>
    </div>
    `;

    // 1. Envoyer au prospect si email fourni
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
            subject: `⚡ Votre Rapport FinOps Cloud (${company}) • Offre -50% Activée`,
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
          subject: `🎯 [AUDIT WINNOW AVEC PROMO -50%] $${annualSave.toLocaleString()}/an pour ${company}`,
          html: `<p><strong>Un audit Winnow avec bannière promo -50% (FOUNDER50 - Fin 7 Nov 2026) a été généré !</strong></p><p>Entreprise: <code>${company}</code><br/>Email: <code>${email || 'Visiteur Web'}</code><br/>Économies: <strong>$${minSave} - $${maxSave}/mois</strong></p><hr/>` + reportHtml,
        }),
      });
    } catch (e) {
      console.error("Erreur envoi email admin Winnow:", e);
    }

    // 3. Notification Telegram
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "8722641204:AAHaMcHVMbNoBygqQdknuWIn14FceYu0e1w";
      const chatId = process.env.TELEGRAM_CHAT_ID || "7561160994";
      if (telegramToken && chatId) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎯 *NOUVEL AUDIT WINNOW LIVRÉ !*\n\n🏢 *Entreprise:* \`${company}\`\n📧 *Email:* \`${email || 'Web'}\`\n💰 *Économies:* $${minSave}–$${maxSave}/mois (~$${annualSave}/an)\n🔥 *Offre Promo:* -50% FOUNDER50 (Jusqu'au 7 Nov 2026)\n📬 *Statut:* Rapport expédié au prospect + 4 Admins ✅`,
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
