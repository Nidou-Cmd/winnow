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
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status ?? (String(err.message).includes('required') ? 400 : 500)).json({ error: err.message });
  }
}
