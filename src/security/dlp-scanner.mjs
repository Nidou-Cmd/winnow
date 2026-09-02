/**
 * Winnow Data Loss Prevention (DLP) & Cyber Threat Scanner
 * Analyzes telemetry streams, metric tags, and log index configurations
 * to detect credential leaks, PII breaches, and compute the financial waste of indexing secrets.
 */

// Regex patterns for credentials and confidential data leaks
const DLP_PATTERNS = [
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    severity: 'critical',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    complianceRisk: 'AWS Account Compromise & Resource Hijacking',
    remediation: 'Immediately rotate IAM credentials and add log scrubbing rules in Datadog Agent.'
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    severity: 'critical',
    regex: /(?:aws_secret_access_key|aws_sec_key|secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    complianceRisk: 'Cloud Root Infrastructure Breach',
    remediation: 'Revoke key in AWS IAM and deploy Datadog sensitive data scanner.'
  },
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    severity: 'critical',
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/g,
    complianceRisk: 'Source Code Repository Exfiltration',
    remediation: 'Revoke token on GitHub and configure pre-commit hooks + OTel filter.'
  },
  {
    id: 'jwt-bearer-token',
    name: 'Unmasked JWT / Bearer Token',
    severity: 'high',
    regex: /\bBearer\s+(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/gi,
    complianceRisk: 'Session Hijacking & Privilege Escalation',
    remediation: 'Mask Authorization headers in HTTP middleware before passing to logger.'
  },
  {
    id: 'rsa-private-key',
    name: 'Private Cryptographic Key',
    severity: 'critical',
    regex: /-----BEGIN (?:RSA|EC|OPENSSH|PGP) PRIVATE KEY[^-]*-----/g,
    complianceRisk: 'Complete Cryptographic Identity Compromise',
    remediation: 'Never output keys in application logs. Scrub at source.'
  },
  {
    id: 'db-connection-string',
    name: 'Database URI with Password',
    severity: 'critical',
    regex: /(?:postgres|mysql|mongodb|redis):\/\/[a-zA-Z0-9_.-]+:([^@\s]{3,})@[a-zA-Z0-9_.-]+:\d+/gi,
    complianceRisk: 'Direct Database Injection & Data Exfiltration',
    remediation: 'Sanitize DATABASE_URL variables before logging database connection pools.'
  },
  {
    id: 'credit-card-number',
    name: 'Exposed Credit Card (PCI-DSS)',
    severity: 'critical',
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    complianceRisk: 'PCI-DSS Failure & Heavy Regulatory Fines',
    validate: isLuhnValid,
    remediation: 'Mandatory PCI scrubbing required. Apply Datadog Sensitive Data Scanner rule.'
  },
  {
    id: 'unmasked-email-pii',
    name: 'Customer Email in Metric Tag',
    severity: 'high',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    complianceRisk: 'GDPR / CCPA Non-Compliance (PII in Unencrypted Metric Tags)',
    remediation: 'Remove email tag from metric dimensions. Hash customer identifier (SHA-256).'
  }
];

/**
 * Validates credit card number with Luhn algorithm to prevent false positives
 */
function isLuhnValid(numStr) {
  const digits = numStr.replace(/[\s-]/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Masks a secret string for safe display in reports (e.g. AKIA1234...99AB)
 */
export function maskSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 8) return '********';
  return secret.slice(0, 4) + '••••••••' + secret.slice(-4);
}

/**
 * Scans a telemetry snapshot for DLP risks
 */
export function runDlpScan(snapshot) {
  const findings = [];
  let totalViolations = 0;
  let criticalCount = 0;
  let highCount = 0;

  // 1. Scan metric names and tags
  for (const item of snapshot.attributionTopMetrics ?? []) {
    const textToScan = [item.metric, ...(item.tags ?? [])].join(' ');
    for (const pattern of DLP_PATTERNS) {
      const matches = textToScan.match(pattern.regex);
      if (matches && matches.length > 0) {
        // Validate if needed (e.g., Luhn check)
        const validMatches = pattern.validate 
          ? matches.filter(pattern.validate) 
          : matches;

        if (validMatches.length > 0) {
          totalViolations += validMatches.length;
          if (pattern.severity === 'critical') criticalCount += validMatches.length;
          else if (pattern.severity === 'high') highCount += validMatches.length;

          findings.push({
            id: `dlp-${pattern.id}-${item.metric}`,
            patternId: pattern.id,
            name: pattern.name,
            severity: pattern.severity,
            sourceType: 'metric_tag',
            sourceLocation: item.metric,
            detectedSamples: validMatches.slice(0, 3).map(maskSecret),
            complianceRisk: pattern.complianceRisk,
            remediation: pattern.remediation,
            impactedSeriesCount: item.seriesCount ?? 1
          });
        }
      }
    }
  }

  // 2. Scan log index filters and sample definitions
  for (const idx of snapshot.logIndexes ?? []) {
    const textToScan = `${idx.name} ${idx.filter} ${(idx.neverQueriedSources ?? []).join(' ')}`;
    for (const pattern of DLP_PATTERNS) {
      const matches = textToScan.match(pattern.regex);
      if (matches && matches.length > 0) {
        totalViolations += matches.length;
        findings.push({
          id: `dlp-log-${idx.name}-${pattern.id}`,
          patternId: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          sourceType: 'log_index',
          sourceLocation: `Index: ${idx.name}`,
          detectedSamples: matches.slice(0, 2).map(maskSecret),
          complianceRisk: pattern.complianceRisk,
          remediation: pattern.remediation,
          impactedSeriesCount: 0
        });
      }
    }
  }

  // Compute Cyber Security Posture Grade (A+ to F)
  let securityScore = 100;
  securityScore -= criticalCount * 25;
  securityScore -= highCount * 10;
  securityScore = Math.max(20, Math.min(100, securityScore));

  let postureGrade = 'A+';
  if (securityScore < 95 && securityScore >= 85) postureGrade = 'A';
  else if (securityScore < 85 && securityScore >= 70) postureGrade = 'B';
  else if (securityScore < 70 && securityScore >= 50) postureGrade = 'C';
  else if (securityScore < 50 && securityScore >= 35) postureGrade = 'D';
  else if (securityScore < 35) postureGrade = 'F';

  // Compute estimated cost wasted in storing/indexing leaked credentials in Datadog
  // (Avg 5-10% of high-cardinality custom metrics or debug log streams)
  const estCostOfExposuresUsd = Math.round(findings.length * 145);

  return {
    postureGrade,
    securityScore,
    totalViolations,
    criticalCount,
    highCount,
    estCostOfExposuresUsd,
    findings,
    scannedAt: new Date().toISOString()
  };
}

/**
 * Generates Datadog Agent and OpenTelemetry sanitization rules to scrub leaks
 */
export function generateScrubbingRules(dlpFindings) {
  const agentScrubRules = dlpFindings.map((f) => {
    return `    - type: mask_sequences
      name: scrub_${f.patternId}
      replace_placeholder: "[REDACTED_${f.patternId.toUpperCase()}]"
      pattern: ${f.patternId.includes('aws') ? '"(AKIA[0-9A-Z]{16})"' : '"Bearer [a-zA-Z0-9_.-]+"'}
`;
  }).join('\n');

  return {
    datadogAgentYaml: `logs_config:
  processing_rules:
${agentScrubRules || '    # No active leaks detected in current telemetry snapshot'}`,
    otelCollectorYaml: `processors:
  redaction:
    allowed_keys: ["safe_key"]
    blocked_values:
      - "AKIA[0-9A-Z]{16}"
      - "ghp_[a-zA-Z0-9]{36}"
      - "Bearer eyJ[a-zA-Z0-9_-]+"
`
  };
}
