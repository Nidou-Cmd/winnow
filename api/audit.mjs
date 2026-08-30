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
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
        
        <!-- HEADER INSTITUTIONNEL -->
        <tr>
          <td style="padding: 28px 32px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 18px; font-weight: 800; color: #059669; letter-spacing: -0.5px;">⚡ Winnow FinOps</span>
                  <span style="font-size: 12px; color: #64748b; font-weight: 500; margin-left: 8px;">| Optimisation des Coûts Cloud</span>
                </td>
                <td align="right">
                  <span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    ✔ Audit FinOps
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CONTENU PRINCIPAL -->
        <tr>
          <td style="padding: 32px;">
            <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Rapport d'Audit FinOps : ${company}</h1>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
              Synthèse des opportunités d'économies identifiées sur votre infrastructure Datadog et télémétrie cloud.
            </p>

            <!-- CARTE ÉCONOMIES CORPORATE -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 18px; border-right: 1px solid #e2e8f0; text-align: center; width: 40%;">
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Économies Détectées</div>
                  <div style="font-size: 24px; font-weight: 800; color: #059669; margin: 4px 0;">$${minSave.toLocaleString()}–$${maxSave.toLocaleString()}</div>
                  <div style="font-size: 12px; font-weight: 600; color: #047857;">~$${annualSave.toLocaleString()} / an</div>
                </td>
                <td style="padding: 18px; width: 60%;">
                  <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">Postes d'Optimisation :</div>
                  <div style="font-size: 13px; color: #475569; line-height: 1.4;">
                    • Métriques personnalisées orphelines<br>
                    • Indexation de logs non requêtés<br>
                    • APM & Conteneurs dormants
                  </div>
                </td>
              </tr>
            </table>

            <!-- 🎁 OFFRE DE LANCEMENT CLAIRE & PROPRE (-50%) -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; margin-bottom: 28px;">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <span style="background-color: #059669; color: #ffffff; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Offre de Lancement • -50% Immédiat
                  </span>
                  <h3 style="margin: 10px 0 6px 0; font-size: 17px; font-weight: 700; color: #14532d;">Déployez Vos Scripts Terraform à Moitié Prix</h3>
                  <p style="margin: 0 0 14px 0; font-size: 13px; color: #166534; line-height: 1.5;">
                    Utilisez le code promo <strong style="font-family: monospace; background: #dcfce7; padding: 2px 6px; border-radius: 4px; border: 1px solid #22c55e;">FOUNDER50</strong> pour bénéficier de 50% de réduction sur l'accès aux snippets d'automatisation Terraform.<br>
                    <span style="font-size: 11px; color: #15803d;">⏳ Valable jusqu'au <strong>7 Novembre 2026 à 23h59 UTC</strong></span>
                  </p>
                  <a href="https://winnowcost.com/?company=${encodeURIComponent(company)}&promo=FOUNDER50" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 11px 24px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                    Appliquer le Code FOUNDER50 & Déployer ➔
                  </a>
                </td>
              </tr>
            </table>

            <!-- BOUTON D'ACTION PRINCIPAL -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://winnowcost.com/?company=${encodeURIComponent(company)}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                    Accéder au Rapport Interactif en Ligne ➔
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER CORPORATE -->
        <tr>
          <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">Winnow FinOps Labs • Infrastructure & Cloud Telemetry Optimization</p>
            <p style="margin: 0;">Ce rapport d'audit a été généré via winnowcost.com. Pour toute question technique, répondez directement à cet email.</p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    `;

    // 1. Envoyer au prospect si email renseigné
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
            subject: `⚡ Rapport d'Audit FinOps Cloud (${company}) • Code FOUNDER50`,
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
          subject: `🎯 [NOUVEL AUDIT WINNOW - CLAIR] $${annualSave.toLocaleString()}/an pour ${company}`,
          html: `<p><strong>Nouvel audit FinOps généré avec le template corporate blanc !</strong></p><p>Entreprise: <code>${company}</code><br/>Email: <code>${email || 'Visiteur Web'}</code><br/>Économies: <strong>$${minSave} - $${maxSave}/mois</strong></p><hr/>` + reportHtml,
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
            text: `🎯 *NOUVEL AUDIT WINNOW LIVRÉ (Modèle Clair B2B)*\n\n🏢 *Entreprise:* \`${company}\`\n📧 *Email:* \`${email || 'Web'}\`\n💰 *Économies:* $${minSave}–$${maxSave}/mois (~$${annualSave}/an)\n🏷️ *Promo:* -50% FOUNDER50 (Fin 7 Nov 2026)\n📬 *Statut:* Rapport corporate expédié au prospect + 4 Admins ✅`,
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
