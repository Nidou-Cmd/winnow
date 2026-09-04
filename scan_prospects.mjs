import { runAudit } from './src/engine/engine.mjs';
import { createPricing } from './src/config/pricing.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// 5 Archetypes de Prospects Cibles B2B / Scale-ups avec forte empreinte d'observabilité
const PROSPECT_PROFILES = [
  {
    company: 'Fintech Core (PayStream)',
    sector: 'Fintech & Paiements Internationaux',
    profileDescription: 'Volume transactionnel élevé, 180 microservices, conformité PCI-DSS & RGPD',
    snapshot: {
      meta: { org: 'PayStream Global', site: 'datadoghq.com', source: 'prospect-scan', generatedAt: new Date().toISOString(), month: '2026-08' },
      usage: {
        customMetricsTotal: 65000,
        infraHostsAvg: 350,
        apmHostsAvg: 280,
        logsIngestedGb: 3400,
        logsIndexedEvents: 1_200_000_000,
        spansIndexedEvents: 650_000_000,
        otherMonthlySpendUsd: 4500
      },
      attributionTopMetrics: [
        { metric: 'payment.tx.latency_ms', seriesCount: 9500, tags: ['env:prod', 'service:checkout', 'card_bin:411111', 'user_email:john.doe@paystream.io'] },
        { metric: 'auth.jwt.verification_time', seriesCount: 8200, tags: ['env:prod', 'jwt_token:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'] },
        { metric: 'fraud.risk.score_eval', seriesCount: 7100, tags: ['env:prod', 'customer_id:cust_98241', 'ip:192.168.1.50'] },
        { metric: 'db.postgres.query_duration', seriesCount: 4500, tags: ['env:prod', 'db_url:postgres://admin:P@ssw0rd123!@db-cluster:5432/core'] },
        { metric: 'legacy.v1.cart_drop', seriesCount: 6200, tags: ['env:legacy', 'version:v1.2'] }
      ],
      queriedMetricNames: new Set(['payment.tx.latency_ms', 'fraud.risk.score_eval', 'system.cpu.user']),
      logIndexes: [
        { name: 'transactions-prod', filter: 'service:payment', exclusionFilters: [], retentionDays: 30, eventShare: 0.60 },
        { name: 'debug-dumps', filter: 'status:debug', exclusionFilters: [], retentionDays: 30, eventShare: 0.30, neverQueriedSources: ['debug', 'trace-dump'] },
        { name: 'audit-compliance', filter: 'source:auditd', exclusionFilters: [{ name: 'noise', query: '-event:cron' }], retentionDays: 90, eventShare: 0.10, complianceRequired: true }
      ],
      hosts: [
        { name: 'stg-fintech-node-01..30', env: 'staging', count: 30, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  },
  {
    company: 'RetailScale (Quick-Commerce SaaS)',
    sector: 'E-Commerce & Logistique en Temps Réel',
    profileDescription: 'Piques de charge massifs, milliers de livreurs et de commandes simultanées',
    snapshot: {
      meta: { org: 'RetailScale Logistics', site: 'us3.datadoghq.com', source: 'prospect-scan', generatedAt: new Date().toISOString(), month: '2026-08' },
      usage: {
        customMetricsTotal: 52000,
        infraHostsAvg: 220,
        apmHostsAvg: 190,
        logsIngestedGb: 4800,
        logsIndexedEvents: 950_000_000,
        spansIndexedEvents: 420_000_000,
        otherMonthlySpendUsd: 2800
      },
      attributionTopMetrics: [
        { metric: 'rider.gps.lat_lon_update', seriesCount: 14000, tags: ['env:prod', 'driver_id:drv_7841', 'lat:48.8566', 'lon:2.3522'] },
        { metric: 'orders.fulfillment.duration_ms', seriesCount: 6800, tags: ['env:prod', 'store_id:store_102', 'order_id:ord_99812'] },
        { metric: 'warehouse.stock.level_v2', seriesCount: 5400, tags: ['sku_id:sku_4492', 'warehouse:wh_paris'] },
        { metric: 'api.legacy.checkout_v0', seriesCount: 4200, tags: ['env:prod', 'aws_key:AKIAIOSFODNN7EXAMPLE'] }
      ],
      queriedMetricNames: new Set(['orders.fulfillment.duration_ms', 'system.memory.used_pct']),
      logIndexes: [
        { name: 'prod-orders', filter: 'service:orders', exclusionFilters: [], retentionDays: 30, eventShare: 0.50 },
        { name: 'nginx-ingress', filter: 'source:nginx', exclusionFilters: [], retentionDays: 30, eventShare: 0.45, neverQueriedSources: ['healthcheck', 'asset-ping'] }
      ],
      hosts: [
        { name: 'stg-retail-worker-01..25', env: 'staging', count: 25, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  },
  {
    company: 'CogniFlow AI (B2B GenAI Agent Platform)',
    sector: 'Intelligence Artificielle & LLM Orchestration',
    profileDescription: 'Workloads GPU, traces LLM APM géantes, tokens d\'API cloud',
    snapshot: {
      meta: { org: 'CogniFlow AI Inc.', site: 'us5.datadoghq.com', source: 'prospect-scan', generatedAt: new Date().toISOString(), month: '2026-08' },
      usage: {
        customMetricsTotal: 44000,
        infraHostsAvg: 160,
        apmHostsAvg: 140,
        logsIngestedGb: 2900,
        logsIndexedEvents: 720_000_000,
        spansIndexedEvents: 850_000_000,
        otherMonthlySpendUsd: 5200
      },
      attributionTopMetrics: [
        { metric: 'llm.token.cost_per_prompt', seriesCount: 11000, tags: ['env:prod', 'model:gpt-4o', 'customer_token:ghp_984128471284918294719284719284719284'] },
        { metric: 'agent.step.execution_time_ms', seriesCount: 8900, tags: ['env:prod', 'agent_id:agent_772', 'session_id:sess_8832'] },
        { metric: 'gpu.vram.utilization_rate', seriesCount: 4100, tags: ['node:gpu_a100_01', 'cluster:us-east'] },
        { metric: 'rag.vector.similarity_score_v1', seriesCount: 3800, tags: ['index:pinecone_main'] }
      ],
      queriedMetricNames: new Set(['agent.step.execution_time_ms', 'gpu.vram.utilization_rate']),
      logIndexes: [
        { name: 'ai-traces', filter: 'service:agent-runtime', exclusionFilters: [], retentionDays: 30, eventShare: 0.70 },
        { name: 'raw-prompts-debug', filter: 'status:debug', exclusionFilters: [], retentionDays: 30, eventShare: 0.25, neverQueriedSources: ['debug', 'prompt-dump'] }
      ],
      hosts: [
        { name: 'stg-ai-cluster-01..18', env: 'staging', count: 18, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  },
  {
    company: 'CarePulse Health (MedTech & Téléconsultation)',
    sector: 'Santé Digitale & Télémédecine',
    profileDescription: 'Données médicales ultra-sensibles (HIPAA / RGPD Santé), téléconsultations',
    snapshot: {
      meta: { org: 'CarePulse Health', site: 'datadoghq.eu', source: 'prospect-scan', generatedAt: new Date().toISOString(), month: '2026-08' },
      usage: {
        customMetricsTotal: 38000,
        infraHostsAvg: 110,
        apmHostsAvg: 90,
        logsIngestedGb: 1800,
        logsIndexedEvents: 510_000_000,
        spansIndexedEvents: 280_000_000,
        otherMonthlySpendUsd: 1900
      },
      attributionTopMetrics: [
        { metric: 'patient.consultation.active_minutes', seriesCount: 7500, tags: ['env:prod', 'doctor_id:doc_882', 'patient_ssn:1850575123456'] },
        { metric: 'video.webrtc.packet_loss', seriesCount: 5200, tags: ['env:prod', 'room_id:rm_3391'] },
        { metric: 'prescription.issued.count_v2', seriesCount: 3100, tags: ['env:prod', 'pharmacy:pharma_paris'] },
        { metric: 'db.health.patient_records_sync', seriesCount: 2900, tags: ['env:prod', 'aws_access_key:AKIA345678901234'] }
      ],
      queriedMetricNames: new Set(['video.webrtc.packet_loss', 'prescription.issued.count_v2']),
      logIndexes: [
        { name: 'hipaa-all-logs', filter: '*', exclusionFilters: [], retentionDays: 90, eventShare: 0.85 },
        { name: 'frontend-errors', filter: 'status:error', exclusionFilters: [], retentionDays: 15, eventShare: 0.15 }
      ],
      hosts: [
        { name: 'stg-carepulse-node-01..12', env: 'staging', count: 12, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  },
  {
    company: 'ChainTrade (Crypto & High-Frequency Trading)',
    sector: 'Web3 & Marchés Financiers Crypto',
    profileDescription: 'Latence micro-seconde, pipelines Kafka / Redis volumineux',
    snapshot: {
      meta: { org: 'ChainTrade Global', site: 'datadoghq.com', source: 'prospect-scan', generatedAt: new Date().toISOString(), month: '2026-08' },
      usage: {
        customMetricsTotal: 78000,
        infraHostsAvg: 290,
        apmHostsAvg: 210,
        logsIngestedGb: 5200,
        logsIndexedEvents: 1_600_000_000,
        spansIndexedEvents: 920_000_000,
        otherMonthlySpendUsd: 6800
      },
      attributionTopMetrics: [
        { metric: 'orderbook.depth.spread_bps', seriesCount: 16000, tags: ['env:prod', 'pair:BTC_USDT', 'exchange_api_key:AKIA888899991111'] },
        { metric: 'kafka.partition.lag_records', seriesCount: 12500, tags: ['env:prod', 'topic:trades_raw', 'partition:p_12'] },
        { metric: 'matching.engine.tick_to_trade_ns', seriesCount: 9400, tags: ['env:prod', 'engine:core_01'] },
        { metric: 'wallet.signer.rsa_validation', seriesCount: 4200, tags: ['env:prod', 'auth:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'] }
      ],
      queriedMetricNames: new Set(['matching.engine.tick_to_trade_ns', 'kafka.partition.lag_records']),
      logIndexes: [
        { name: 'orderbook-ticks', filter: 'source:matching', exclusionFilters: [], retentionDays: 30, eventShare: 0.65 },
        { name: 'ws-gateway-debug', filter: 'status:debug', exclusionFilters: [], retentionDays: 30, eventShare: 0.30, neverQueriedSources: ['debug', 'ws-dump'] }
      ],
      hosts: [
        { name: 'stg-trade-worker-01..35', env: 'staging', count: 35, monitoredHoursPerWeek: 168 }
      ],
      warnings: []
    }
  }
];

const pricing = createPricing({});
const results = [];

for (const p of PROSPECT_PROFILES) {
  const audit = runAudit(p.snapshot, pricing);
  results.push({
    company: p.company,
    sector: p.sector,
    profileDescription: p.profileDescription,
    audit
  });
}

writeFileSync('./reports_prospects_scan.json', JSON.stringify(results, null, 2));
console.log(`✅ Scanné ${results.length} profils de prospects avec succès.`);
for (const r of results) {
  console.log(`\n🏢 ${r.company} (${r.sector})`);
  console.log(`   💰 Facture Estimée  : $${r.audit.totalBaselineUsd.toLocaleString()}/mois`);
  console.log(`   📉 Économies Winnow : $${r.audit.totals.monthlySavingsMinUsd.toLocaleString()} - $${r.audit.totals.monthlySavingsMaxUsd.toLocaleString()}/mois (~$${r.audit.totals.annualizedSavingsMaxUsd.toLocaleString()}/an)`);
  console.log(`   🛡️ Score Cyber DLP  : Grade ${r.audit.cybersecurity.postureGrade} (${r.audit.cybersecurity.securityScore}/100) - ${r.audit.cybersecurity.totalViolations} fuites critiques`);
  console.log(`   ⚡ GitOps Fix       : ${r.audit.gitops.safeRulesCount} blocs Terraform (Safety Score: ${r.audit.gitops.safetyScore}%)`);
}
