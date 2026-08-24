import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { buildDemoSnapshot } from '../src/mock/fixtures.mjs';
import { DatadogClient } from '../src/datadog/client.mjs';
import { runAudit } from '../src/engine/engine.mjs';
import { renderHtmlReport } from '../src/report/html.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const ROOT = resolve(import.meta.dirname, '..');
const REPORTS = process.env.AUDIT_OUT_DIR
  ? resolve(process.env.AUDIT_OUT_DIR)
  : resolve(tmpdir(), 'telemetry-audit-reports');
mkdirSync(REPORTS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml'
};

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function readJsonBody(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function runAuditFromRequest(body) {
  let snapshot;
  if (body.mode === 'mock') {
    snapshot = buildDemoSnapshot();
  } else {
    const client = new DatadogClient({
      apiKey: String(body.apiKey ?? ''),
      appKey: String(body.appKey ?? ''),
      site: String(body.site ?? 'datadoghq.com')
    });
    snapshot = await client.collectAll();
  }
  const audit = runAudit(snapshot);
  const id = `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  writeFileSync(resolve(REPORTS, `${id}.html`), renderHtmlReport(audit));
  return {
    id,
    url: `/reports/${id}.html`,
    totals: audit.totals,
    findings: audit.findings.map((f) => ({ title: f.title, severity: f.severity }))
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, readFileSync(resolve(ROOT, 'site/index.html')), MIME['.html']);
    }

    if (req.method === 'GET' && url.pathname.startsWith('/reports/')) {
      const name = basename(url.pathname.slice('/reports/'.length));
      const file = resolve(REPORTS, name);
      if (!file.startsWith(REPORTS) || !existsSync(file)) return send(res, 404, '{"error":"not found"}');
      return send(res, 200, readFileSync(file), MIME[extname(file)] ?? MIME['.html']);
    }

    if (req.method === 'POST' && url.pathname === '/api/audit') {
      const body = await readJsonBody(req);
      const result = await runAuditFromRequest(body);
      return send(res, 200, JSON.stringify(result));
    }

    if (req.method === 'GET' && url.pathname === '/healthz') {
      return send(res, 200, '{"ok":true}');
    }

    send(res, 404, '{"error":"not found"}');
  } catch (err) {
    send(res, err.status ?? (err.message.includes('required') ? 400 : 500), JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`telemetry-cost-audit server running at http://${HOST}:${PORT}`);
  console.log(`reports dir: ${REPORTS}`);
  console.log('POST /api/audit {"mode":"mock"} for a demo report.');
});
