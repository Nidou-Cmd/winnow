# 🚀 Winnow Launch & Directory Copy Kit

## 🏷️ Taglines
- **Ultra-Short:** *Separate the signals from the spend. Spot 30%+ waste on Datadog in 45s.*
- **Product Hunt:** *Find the money hiding in your Datadog & Cloud bill (Zero-dependency, 100% read-only).*
- **Hacker News:** *Show HN: Winnow – A zero-dependency Node.js CLI that finds unused Datadog metrics*

## 📝 Short Description
Winnow runs a 45-second, 100% read-only audit on your Datadog and AWS metrics to locate orphaned time-series and unattached volumes saving $5k–$50k/year.

## 📜 Full Launch Description
If your engineering team uses Datadog, AWS, or GCP, you've likely experienced "billing shock"—a surprise 35% spike on your monthly invoice caused by an unannounced debug flag, orphaned time-series, or unattached EBS volumes.

Existing FinOps tools require heavy agents, complex IAM roles, or third-party SaaS data ingestion. We built **Winnow** to be the exact opposite.

### Key Features
- **45-Second Audit:** Enter a read-only API key or run the CLI locally to audit your metric usage instantly.
- **Zero-Data Privacy Risk:** Metadata-only analysis. No payload data, logs, or sensitive traces leave your machine.
- **Orphan Time-Series Finder:** Detects custom metrics emitting data that no dashboard or monitor has referenced in 90+ days.
- **AWS & GCP Cost Rules:** Identifies unattached EBS storage and unoptimized BigQuery slot/query patterns.
- **Actionable Report:** Generates an executive PDF/HTML report showing exact time-series names to delete.
