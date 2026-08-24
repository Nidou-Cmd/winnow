import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { readJsonBody, runAuditFromBody } from '../src/web/audit-handler.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const ROOT = resolve(import.meta.dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml'
};

function send(res, code, body, type = 'application/json') {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, readFileSync(resolve(ROOT, 'public/index.html')), MIME['.html']);
    }

    if (req.method === 'POST' && url.pathname === '/api/audit') {
      const body = await readJsonBody(req);
      const result = await runAuditFromBody(body);
      return send(res, 200, result);
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
