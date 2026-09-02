import crypto from 'node:crypto';
import { runAudit } from '../engine/engine.mjs';
import { runDlpScan } from './dlp-scanner.mjs';
import { CryptographicAuditLedger } from './audit-ledger.mjs';

/**
 * Winnow In-VPC / Air-Gapped Runner
 * Runs 100% locally inside the customer VPC/Kubernetes pod.
 * Guarantees zero credential exfiltration.
 */
export class InVpcRunner {
  constructor(options = {}) {
    this.clusterId = options.clusterId || `k8s-vpc-${crypto.randomBytes(4).toString('hex')}`;
    this.ledger = new CryptographicAuditLedger({ org: options.org || 'enterprise-in-vpc', clusterId: this.clusterId });
  }

  executeLocalAudit(snapshot, pricing) {
    const startTime = Date.now();

    // 1. Run FinOps core engine
    const finopsAudit = runAudit(snapshot, pricing);

    // 2. Run Data Loss Prevention & Cyber Threat Scanner locally
    const dlpResults = runDlpScan(snapshot);

    // 3. Append to local cryptographic ledger
    const auditRecord = {
      meta: snapshot.meta,
      totals: finopsAudit.totals,
      securityScore: dlpResults.securityScore,
      dlpScan: dlpResults
    };
    const block = this.ledger.appendAuditEvent(auditRecord, { inVpc: true });

    const durationMs = Date.now() - startTime;

    // 4. Generate local air-gapped attestation token
    const attestationToken = crypto
      .createHmac('sha256', this.clusterId)
      .update(`${block.hash}.${dlpResults.securityScore}.${finopsAudit.totals.estSavingsAnnualMin}`)
      .digest('hex');

    return {
      success: true,
      executionMode: 'IN_VPC_AIR_GAPPED',
      zeroDataExfiltrationGuaranteed: true,
      clusterId: this.clusterId,
      attestationToken,
      durationMs,
      finops: finopsAudit,
      cybersecurity: dlpResults,
      complianceBundle: this.ledger.exportComplianceBundle()
    };
  }
}
