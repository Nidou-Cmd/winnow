export const maxDuration = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST method required' });
    return;
  }

  try {
    let event = req.body;
    if (typeof event === 'string') {
      try { event = JSON.parse(event); } catch (_) {}
    }

    if (event && event.event === 'charge.success') {
      const data = event.data;
      console.log(`[Winnow Paystack Webhook Success]: Transaction ${data.reference} paid by ${data.customer?.email}`);
      res.status(200).json({ received: true, reference: data.reference });
      return;
    }

    res.status(200).json({ received: true, event: event?.event });
  } catch (err) {
    console.error('[Winnow Webhook Error]:', err);
    res.status(500).json({ error: err.message || 'Webhook processing failed' });
  }
}
