export const maxDuration = 30;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST method required' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }
    if (!body || typeof body !== 'object') {
      body = {};
    }

    const email = body.email || 'customer@marginguard.com';
    const amountXof = body.amountXof || body.amount || 25000;
    const plan = body.plan || 'winnow_pro_audit';
    const callbackUrl = body.callbackUrl;

    const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_d37adc9c65d924f278e9493afce2dfcc17a72964';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winnowcost.com';
    const redirectUrl = callbackUrl || `${appUrl}/?paid=true`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(amountXof) * 100),
        currency: 'XOF',
        callback_url: redirectUrl,
        channels: ['mobile_money', 'card'],
        metadata: {
          project: 'winnow',
          plan,
          custom_fields: [
            { display_name: 'Service', variable_name: 'service', value: 'Winnow Cost Optimization Pro' }
          ]
        }
      })
    });

    const data = await response.json();

    if (!data.status) {
      res.status(400).json({ error: data.message || 'Initialization failed' });
      return;
    }

    res.status(200).json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference
    });
  } catch (err) {
    console.error('[Winnow Paystack Error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
