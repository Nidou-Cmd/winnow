import { parseTerraformDatadogManifest } from './src/parsers/terraform-parser.mjs';
import { runAudit } from './src/engine/engine.mjs';

const sampleHcl = `
# Infrastructure de logs Datadog
resource "datadog_logs_index" "prod_core" {
  name               = "production-core"
  query              = "env:prod"
  num_retention_days = 30
}

resource "datadog_logs_index" "debug_logs" {
  name               = "debug-unfiltered"
  query              = "status:debug"
  num_retention_days = 30
}

# Métrique configurée
resource "datadog_metric_tag_configuration" "http_requests" {
  metric_name = "http.requests.total"
  metric_type = "count"
}
`;

const parsed = parseTerraformDatadogManifest(sampleHcl);
console.log('✅ Parseur Terraform Résumé :', parsed.summary);

const audit = runAudit(parsed.snapshot);
console.log(`✅ Audit Réussi sans clé API !`);
console.log(`   Économies estimées : $${audit.totals.monthlySavingsMinUsd} à $${audit.totals.monthlySavingsMaxUsd}/mois`);
console.log(`   Findings détectés  : ${audit.findings.length}`);
