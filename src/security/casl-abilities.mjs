/**
 * Winnow CASL Isomorphic Authorization Engine
 * Defines fine-grained permissions for users, devops, and CISO auditors.
 */

export function defineAbilitiesFor(user = { role: 'anonymous' }) {
  const rules = [];

  // Helper builder
  function can(action, subject, conditions = undefined) {
    rules.push({ action, subject, conditions, inverted: false });
  }

  function cannot(action, subject, conditions = undefined) {
    rules.push({ action, subject, conditions, inverted: true });
  }

  // 1. Anonymous User
  can('read', 'PublicLandingPage');
  can('run', 'TerraformOfflineAudit');
  can('run', 'MockAudit');
  can('run', 'InBrowserLiveAudit');
  can('inspect', 'ClientAttestationCode');
  cannot('download', 'CisoEnterpriseReport');
  cannot('manage', 'AutomatedIngestionFilters');

  // 2. Guardrails Pro User
  if (user.role === 'pro' || user.role === 'scale' || user.role === 'admin') {
    can('download', 'CisoEnterpriseReport');
    can('export', 'TerraformPRRemediation');
    can('view', 'DlpSecretFindings');
    can('schedule', 'WeeklyCostAlerts');
  }

  // 3. Enterprise CISO / Scale User
  if (user.role === 'scale' || user.role === 'admin') {
    can('deploy', 'InVpcHelmChart');
    can('manage', 'MultiOrgDatadogAccounts');
    can('configure', 'TailSamplingPipelines');
    can('access', 'CryptographicAuditLedgerWORM');
  }

  return {
    rules,
    can(action, subject) {
      const match = rules.find((r) => r.action === action && (r.subject === subject || r.subject === 'all') && !r.inverted);
      return Boolean(match);
    },
    cannot(action, subject) {
      return !this.can(action, subject);
    }
  };
}
