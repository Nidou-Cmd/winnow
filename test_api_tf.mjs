async function testApi() {
  const sampleHcl = `
  resource "datadog_logs_index" "prod" {
    name = "production"
    query = "env:prod"
    num_retention_days = 30
  }
  `;
  const res = await fetch('http://127.0.0.1:3006/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'terraform', terraformHcl: sampleHcl, discountPercent: 25, password: 'nidou2026' })
  });
  console.log('HTTP Status:', res.status);
  const json = await res.json();
  console.log('Totals:', json.totals);
  console.log('Cybersecurity Grade:', json.cybersecurity?.postureGrade);
  console.log('GitOps safe rules:', json.gitops?.safeRulesCount);
  console.log('HTML report generated length:', json.html?.length);
}
testApi().catch(console.error);
