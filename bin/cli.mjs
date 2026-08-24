import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildDemoSnapshot } from '../src/mock/fixtures.mjs';
import { DatadogClient } from '../src/datadog/client.mjs';
import { createPricing } from '../src/config/pricing.mjs';
import { runAudit } from '../src/engine/engine.mjs';
import { renderHtmlReport } from '../src/report/html.mjs';

function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const [k, v] = raw.slice(2).split('=');
      args[k] = v === undefined ? true : v;
    } else args._.push(raw);
  }
  return args;
}

const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? 'audit';

  if (command !== 'audit' || args.help) {
    console.error('Usage: node bin/cli.mjs audit [--mock | --api-key=... --app-key=... --site=datadoghq.com] [--discount=N%] [--json] [--out=DIR]');
    process.exit(args.help ? 0 : 1);
  }

  let snapshot;
  if (args.mock) {
    console.log('[audit] building demo audit from sample data...');
    snapshot = buildDemoSnapshot();
  } else {
    const apiKey = args['api-key'] ?? process.env.DD_API_KEY;
    const appKey = args['app-key'] ?? process.env.DD_APP_KEY;
    const site = args.site ?? process.env.DD_SITE ?? 'datadoghq.com';
    console.log(`[audit] connecting to Datadog (${site}) in read-only mode...`);
    snapshot = await new DatadogClient({ apiKey, appKey, site }).collectAll();
    console.log(`[audit] collection finished with ${snapshot.warnings.length} warning(s)`);
  }

  const discountPercent = parseFloat(args.discount ?? 0);
  const pricing = createPricing({ discountPercent });
  const audit = runAudit(snapshot, pricing);

  if (args.json) {
    const jsonOutput = JSON.stringify(audit, null, 2);
    if (args.out) {
      const outDir = resolve(args.out);
      mkdirSync(outDir, { recursive: true });
      const file = resolve(outDir, `audit-${args.mock ? 'demo' : 'live'}.json`);
      writeFileSync(file, jsonOutput);
      console.log(`  JSON Report: ${file}`);
    } else {
      console.log(jsonOutput);
    }
    return;
  }

  const html = renderHtmlReport(audit);

  const outDir = resolve(args.out ?? process.env.AUDIT_OUT_DIR ?? resolve(tmpdir(), 'telemetry-audit-reports'));
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = resolve(outDir, `audit-${args.mock ? 'demo' : 'live'}-${stamp}.html`);
  writeFileSync(file, html);

  console.log('');
  console.log(`  Organization : ${snapshot.meta.org ?? '(from API)'}`);
  if (discountPercent > 0) console.log(`  Discount     : ${discountPercent}% applied`);
  console.log(`  Est. bill    : ${usd(audit.totalBaselineUsd)}/mo`);
  console.log(`  Savings      : ${usd(audit.totals.monthlySavingsMinUsd)} - ${usd(audit.totals.monthlySavingsMaxUsd)}/mo (${audit.totals.percentOfBillMin}%-${audit.totals.percentOfBillMax}%)`);
  console.log(`  Findings     : ${audit.findings.length}`);
  for (const f of audit.findings) {
    console.log(`    [${f.severity.toUpperCase().padEnd(6)}] ${f.title} -> ${usd(f.estMonthlySavingsMin)}-${usd(f.estMonthlySavingsMax)}`);
  }
  console.log('');
  console.log(`  Report: ${file}`);

  if (args.open === true || (args.open !== false && !args.mock)) {
    try {
      const { exec } = await import('node:child_process');
      const cmd =
        process.platform === 'win32'
          ? `start "" "${file}"`
          : process.platform === 'darwin'
            ? `open "${file}"`
            : `xdg-open "${file}"`;
      exec(cmd);
    } catch {}
  }
}

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
