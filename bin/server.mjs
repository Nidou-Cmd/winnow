import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { readJsonBody, runAuditFromBody } from '../src/web/audit-handler.mjs';

const ROOT = resolve(import.meta.dirname, '..');

// Load .env.local if present
const envPath = resolve(ROOT, '.env.local');
if (existsSync(envPath)) {
  const envText = readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      process.env[key.trim()] = vals.join('=').trim();
    }
  }
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml'
};

function send(res, code, body, type = 'application/json') {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': type,
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return send(res, 204, '');
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, readFileSync(resolve(ROOT, 'public/index.html')), MIME['.html']);
    }

    const staticPath = resolve(ROOT, 'public', url.pathname.slice(1));
    if (req.method === 'GET' && existsSync(staticPath) && !url.pathname.includes('..')) {
      const ext = extname(staticPath).toLowerCase();
      return send(res, 200, readFileSync(staticPath), MIME[ext] || 'text/html; charset=utf-8');
    }

    if (req.method === 'POST' && url.pathname === '/api/audit') {
      const body = await readJsonBody(req);
      const result = await runAuditFromBody(body);
      return send(res, 200, result);
    }

    if (req.method === 'POST' && (url.pathname === '/api/paystack/initialize' || url.pathname === '/api/paystack-initialize')) {
      const initHandler = (await import('../api/paystack-initialize.mjs')).default;
      return initHandler(req, {
        status: (code) => ({
          json: (data) => send(res, code, data)
        })
      });
    }

    if (req.method === 'POST' && (url.pathname === '/api/paystack/webhook' || url.pathname === '/api/paystack-webhook')) {
      const webhookHandler = (await import('../api/paystack-webhook.mjs')).default;
      return webhookHandler(req, {
        status: (code) => ({
          json: (data) => send(res, code, data)
        })
      });
    }

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return send(res, 200, '{"ok":true}');
    }

    send(res, 404, '{"error":"not found"}');
  } catch (err) {
    send(res, err.status ?? (String(err.message).includes('required') ? 400 : 500), { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`telemetry-cost-audit server running at http://${HOST}:${PORT}`);
  console.log('POST /api/audit {"mode":"mock"} for a demo report.');
});
