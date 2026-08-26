import crypto from 'node:crypto';
import { readJsonBody } from '../src/web/audit-handler.mjs';

export const maxDuration = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }

  try {
    const rawBody = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
    });

    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY;

    if (secret && !secret.includes('sk_test_xxx')) {
      const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
      if (hash !== signature) {
        res.status(401).json({ error: 'Invalid Paystack signature' });
        return;
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const data = event.data;
      const customerEmail = data.customer?.email;
      const amountXof = data.amount / 100;
      const channel = data.channel;

      console.log(`[Winnow Paystack Webhook] Succès (${channel}): ${customerEmail} - ${amountXof} XOF`);
    }

    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('[Winnow Paystack Webhook Error]:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
