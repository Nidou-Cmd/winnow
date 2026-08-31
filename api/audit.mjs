import { readJsonBody, runAuditFromBody } from '../src/web/audit-handler.mjs';

export const maxDuration = 60;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
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
      <style>
        @media only screen and (max-width: 480px) {
          .mobile-pad { padding: 20px 16px !important; }
          .mobile-stack { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; }
          .mobile-stack-last { display: block !important; width: 100% !important; padding-top: 14px !important; }
          .mobile-title { font-size: 20px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;">
        
        <!-- HEADER INSTITUTIONNEL -->
        <tr>
          <td style="padding: 22px 24px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 18px; font-weight: 800; color: #059669; letter-spacing: -0.5px;">⚡ Winnow FinOps</span>
                </td>
                <td align="right">
                  <span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 16px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    ✔ Audit FinOps
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CONTENU PRINCIPAL -->
        <tr>
          <td class="mobile-pad" style="padding: 28px 24px;">
            <h1 class="mobile-title" style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3;">
              Rapport FinOps : ${company}
            </h1>
            <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
              Optimisation de votre consommation de télémétrie Datadog & compute cloud.
            </p>

            <!-- CARTE ÉCONOMIES RESPONSIVE -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
              <tr>
                <td class="mobile-stack" style="padding: 16px; border-right: 1px solid #e2e8f0; text-align: center; width: 42%; vertical-align: middle;">
                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Économies Estimées</div>
                  <div style="font-size: 22px; font-weight: 900; color: #059669; margin: 4px 0;">$${minSave.toLocaleString()}–$${maxSave.toLocaleString()}</div>
                  <div style="font-size: 12px; font-weight: 700; color: #047857;">~$${annualSave.toLocaleString()} / an</div>
                </td>
                <td class="mobile-stack-last" style="padding: 16px; width: 58%; vertical-align: middle;">
                  <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Pistes d'Action :</div>
                  <div style="font-size: 12px; color: #475569; line-height: 1.6;">
                    • <strong>Métriques :</strong> Séries orphelines à purger<br>
                    • <strong>Logs :</strong> Ingestion brute optimisable<br>
                    • <strong>APM :</strong> Workloads inactifs détectés
                  </div>
                </td>
              </tr>
            </table>

            <!-- 🔥 BANNIÈRE OFFRE LANCEMENT - RESPONSIVE & NON-ENCOMBRÉE 🔥 -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 22px 18px; text-align: center;">
                  
                  <!-- Tag Promo Court -->
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 10px auto;">
                    <tr>
                      <td style="background-color: #059669; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        Offre de Lancement (-50%)
                      </td>
                    </tr>
                  </table>

                  <!-- Titre Aéré -->
                  <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 800; color: #14532d; line-height: 1.3;">
                    Déployez les correctifs Terraform à moitié prix
                  </h3>

                  <p style="margin: 0 0 14px 0; font-size: 13px; color: #166534; line-height: 1.4;">
                    Appliquez le code promo pour débloquer les automatisations d'infrastructure.
                  </p>

                  <!-- Box Code Promo Dédiée & Respiration -->
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto; background-color: #ffffff; border: 1px dashed #059669; border-radius: 8px; width: 100%; max-width: 260px;">
                    <tr>
                      <td style="padding: 10px 14px; text-align: center;">
                        <div style="font-size: 10px; font-weight: 700; color: #14532d; text-transform: uppercase;">Code Promo</div>
                        <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; color: #059669; letter-spacing: 2px;">FOUNDER50</div>
                        <div style="font-size: 11px; color: #166534; margin-top: 4px; border-top: 1px solid #dcfce7; padding-top: 4px;">
                          Expire le <strong>7 Novembre 2026</strong>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Bouton Responsive Pleine Largeur Mobile -->
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%; max-width: 280px;">
                    <tr>
                      <td align="center" style="background-color: #059669; border-radius: 8px;">
                        <a href="https://winnowcost.com/?company=${encodeURIComponent(company)}&promo=FOUNDER50" style="display: block; width: 100%; padding: 12px 18px; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; text-align: center; box-sizing: border-box;">
                          Appliquer le Code & Déployer ➔
                        </a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

            <!-- BOUTON D'ACTION SECONDAIRE RAPPORT -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://winnowcost.com/?company=${encodeURIComponent(company)}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 700;">
                    Accéder au Rapport Interactif en Ligne ➔
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER CORPORATE -->
        <tr>
          <td style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #475569;">Winnow FinOps Labs • Infrastructure & Cloud Telemetry Optimization</p>
            <p style="margin: 0;">Rapport officiel généré pour <strong>${company}</strong>.</p>
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
            subject: `⚡ Rapport FinOps Cloud (${company}) • Code FOUNDER50`,
            html: reportHtml,
          }),
        });
      } catch (e) {
        console.error("Erreur envoi email prospect Winnow:", e);
      }
    }

    // 2. Toujours envoyer aux Admins
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
          subject: `🎯 [AUDIT WINNOW - RESPONSIVE] $${annualSave.toLocaleString()}/an pour ${company}`,
          html: reportHtml,
        }),
      });
    } catch (e) {
      console.error("Erreur envoi email admin Winnow:", e);
    }

    // 3. Notification Telegram
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (telegramToken && chatId) {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎯 *NOUVEL AUDIT WINNOW (Responsive 100%)*\n\n🏢 *Entreprise:* \`${company}\`\n💰 *Économies:* $${minSave}–$${maxSave}/mois\n🏷️ *Promo:* -50% FOUNDER50\n📬 *Statut:* Livré ✅`,
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
