import { readJsonBody, runAuditFromBody } from '../src/web/audit-handler.mjs';

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST with JSON body {"mode":"mock"} or credentials' });
    return;
  }
  try {
    const body = await readJsonBody(req);
    const result = await runAuditFromBody(body);

    // Send instant Telegram notification
    try {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN || "8722641204:AAEN3nhyxy2sr36WrgRGzRvJrJuXFtSdfbg";
      const chatId = process.env.TELEGRAM_CHAT_ID || "7561160994";
      if (telegramToken && chatId) {
        const minSave = Math.round(result.totals?.monthlySavingsMinUsd || 0);
        const maxSave = Math.round(result.totals?.monthlySavingsMaxUsd || 0);
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎯 *NOUVEL AUDIT WINNOW GÉNÉRÉ*\n\n🏢 *Org:* \`${result.meta?.org || 'Demo'}\`\n💰 *Économies estimées:* $${minSave}–$${maxSave}/mois\nMODE: ${result.meta?.source || 'mock'}`,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (e) {
      // Ignore notification errors
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(err.status ?? (String(err.message).includes('required') ? 400 : 500)).json({ error: err.message });
  }
}
