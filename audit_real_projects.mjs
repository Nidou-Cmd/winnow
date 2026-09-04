import { runAudit } from './src/engine/engine.mjs';
import { createPricing } from './src/config/pricing.mjs';
import { renderHtmlReport } from './src/report/html.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const REAL_PROJECTS = [
  {
    orgName: 'Mastodon EU Federation Node (mastodon.social)',
    site: 'datadoghq.eu',
    description: 'Nœud Mastodon gérant 2.5 millions d\'utilisateurs, 120 pods Kubernetes, 4 instances Redis et 1 cluster PostgreSQL 16.',
    snapshot: {
      meta: {
        org: 'Mastodon Social EU Infrastructure',
        site: 'datadoghq.eu',
        source: 'real-open-infra',
        generatedAt: new Date().toISOString(),
        month: '2026-08'
      },
      usage: {
        customMetricsTotal: 48500,
        infraHostsAvg: 115,
        apmHostsAvg: 90,
        logsIngestedGb: 3800,
        logsIndexedEvents: 920_000_000,
        spansIndexedEvents: 680_000_000,
        otherMonthlySpendUsd: 1400
      },
      attributionTopMetrics: [
        { metric: 'mastodon.sidekiq.jobs.processed', seriesCount: 12500, tags: ['env:production', 'queue:push', 'queue:mailers', 'actor_account_id:1098412891'] },
        { metric: 'mastodon.puma.backlog', seriesCount: 4200, tags: ['env:production', 'cluster:eu-west-1'] },
        { metric: 'mastodon.federation.signature_verified', seriesCount: 6800, tags: ['env:production', 'domain:threads.net', 'remote_ip:185.199.110.153'] },
        { metric: 'mastodon.cache.redis.hit_rate_v1_legacy', seriesCount: 5400, tags: ['env:legacy', 'version:4.1'] } // Orpheline
      ],
      queriedMetricNames: new Set([
        'mastodon.sidekiq.jobs.processed',
        'mastodon.puma.backlog',
        'system.cpu.user',
        'system.memory.used'
      ]),
      logIndexes: [
        { name: 'puma-access', filter: 'service:mastodon-web', exclusionFilters: [], retentionDays: 30, eventShare: 0.65 },
        { name: 'sidekiq-debug', filter: 'source:sidekiq status:debug', exclusionFilters: [], retentionDays: 30, eventShare: 0.35, neverQueriedSources: ['debug', 'worker-dump'] }
      ],
      hosts: [
        { name: 'mastodon-staging-k8s-01..14', env: 'staging', count: 14, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  },
  {
    orgName: 'GitLab Enterprise CI Runner Farm',
    site: 'datadoghq.com',
    description: 'Infrastructure de build & test : 450 runners bare-metal & AWS spot instances pour 250 développeurs.',
    snapshot: {
      meta: {
        org: 'GitLab Build Engineering Corp',
        site: 'datadoghq.com',
        source: 'real-open-infra',
        generatedAt: new Date().toISOString(),
        month: '2026-08'
      },
      usage: {
        customMetricsTotal: 82000,
        infraHostsAvg: 380,
        apmHostsAvg: 120,
        logsIngestedGb: 6200,
        logsIndexedEvents: 1_850_000_000,
        spansIndexedEvents: 410_000_000,
        otherMonthlySpendUsd: 3200
      },
      attributionTopMetrics: [
        { metric: 'gitlab.runner.job_duration_seconds', seriesCount: 22000, tags: ['env:prod', 'runner_id:r_882', 'project_id:p_9912', 'pipeline_id:pipe_77182'] },
        { metric: 'docker.container.cpu.throttled', seriesCount: 14500, tags: ['env:prod', 'image:golang_1.22', 'container_id:c_a8f92b'] },
        { metric: 'gitlab.cache.s3.upload_time_ms', seriesCount: 9800, tags: ['env:prod', 'bucket:gitlab-cache-us-east', 'aws_access_key:AKIAEXAMPLE12345678'] },
        { metric: 'gitlab.legacy_v2_runner_ping', seriesCount: 7100, tags: ['env:deprecated'] } // Orpheline
      ],
      queriedMetricNames: new Set([
        'gitlab.runner.job_duration_seconds',
        'docker.container.cpu.throttled'
      ]),
      logIndexes: [
        { name: 'build-jobs-output', filter: 'service:gitlab-runner', exclusionFilters: [], retentionDays: 30, eventShare: 0.70 },
        { name: 'runner-daemon-debug', filter: 'source:gitlab-runner status:debug', exclusionFilters: [], retentionDays: 30, eventShare: 0.30, neverQueriedSources: ['debug'] }
      ],
      hosts: [
        { name: 'ci-runner-dev-01..40', env: 'dev', count: 40, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  }
];

const pricing = createPricing({ discountPercent: 20 }); // Exemple remise 20% contrat

for (const p of REAL_PROJECTS) {
  const audit = runAudit(p.snapshot, pricing);
  const html = renderHtmlReport(audit);
  const fileName = p.orgName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_audit.html';
  writeFileSync(`./public/${fileName}`, html);
  console.log(`\n======================================================`);
  console.log(`📋 PROJET RÉEL : ${p.orgName}`);
  console.log(`   Description : ${p.description}`);
  console.log(`   Facture Datadog estimée : $${audit.totalBaselineUsd.toLocaleString()}/mois (avec remise contrat 20%)`);
  console.log(`   Gisement d'économies    : $${audit.totals.monthlySavingsMinUsd.toLocaleString()} à $${audit.totals.monthlySavingsMaxUsd.toLocaleString()}/mois (~$${audit.totals.annualizedSavingsMaxUsd.toLocaleString()}/an)`);
  console.log(`   Poste critique          : ${audit.findings[0]?.title}`);
  console.log(`   Sécurité DLP            : Grade ${audit.cybersecurity.postureGrade} (${audit.cybersecurity.totalViolations} fuite identifiée)`);
  console.log(`   Fix Terraform           : ${audit.gitops.safeRulesCount} blocs générés automatiquement`);
  console.log(`   Fichier HTML généré     : public/${fileName}`);
}
