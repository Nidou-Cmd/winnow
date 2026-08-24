# Stratégie produit — telemetry-cost-audit

## Le problème

- Factures d'observabilité (Datadog surtout) : **5–50K$/mois** pour les startups Series A–B.
- Douleur massive et publique (HN : "Our renewal bill came to $83,000/year before we canceled", Coinbase $65M/an).
- Mécanique du gaspillage :
  - Custom metrics : 100 gratuites/host, puis 5$/100 — **chaque combinaison nom+tag est facturée** ; un `customer_id` ajouté en 5 min peut générer des centaines de milliers de séries.
  - Logs : ingestion ~0.10$/GB + indexation ~1.70$/M events, rétention multipliée (30j = ×2, 90j = ×6).
  - APM : spans indexées sans sampling.
  - Hosts de staging/dev monitorés 168h/semaine pour un usage de ~40h.

## Le signal d'alarme à contourner

Un ex-VP Logging de New Relic a échoué sur ce créneau exact ("Cribl pour Datadog") : le coût
d'observabilité est un **problème sans owner et sans priorité** jusqu'au renouvellement annuel,
quand le CFO hurle. Cribl a gagné en vendant à la sécurité.

**Conséquence stratégique** : ne pas vendre "un dashboard de coûts" mais un
choc chiffré (l'audit gratuit) déclenché au bon moment (renouvellement).

## Positionnement

> "Snyk pour ta facture d'observabilité" — audit gratuit en 2 minutes qui chiffre
> le gaspillage au dollar, puis guardrails continus.

### Espace libre concurrentiel

| Acteur | Fait | Ne fait pas |
|---|---|---|
| Datadog CCM / Metrics without Limits | Gouvernance native | Ne maximisera jamais tes économies (conflit d'intérêts) |
| Vantage | Visibilité multi-cloud | Visibilité ≠ action corrective |
| CloudZero / Finout | Allocation enterprise | Cher, lent, pas self-serve |
| Cribl Stream | Pipeline security-led | Lourd, overkill Series A–B |
| Sawmills | Telemetry management agentique | Early, focus pipelines complexes |
| SigNoz / OpenObserve | Migration hors Datadog | Migration = projet 6 mois risqué |

Le créneau : **auditer + corriger dans Datadog, self-serve, en 24h**, metadata-only.

## Produit

1. **Wedge — audit gratuit** (lead magnet viral) : connect OAuth read-only → rapport en 10 min avec économies chiffrées par finding.
2. **Guardrails payants** ($299 → $999/mo) : alertes Slack avant la facture ("ce déploiement ajoute 12K séries = +600$/mois"), quarantaine auto des orphelines, budgets par équipe, rapport board-ready CFO.
3. **Expansion** : Snowflake, Databricks, OpenAI — même douleur, mêmes acheteurs.

## Modèle économique

- ROI no-brainer : facture 20K$/mois → −30% = 6K$ économisés vs 999$ d'abonnement.
- Self-serve, cycle de vente court, déclencheur = renewal annuel Datadog.
- 300 clients à 700$/mois moyens ≈ 2.5M$ ARR.

## Moat

Le code est copiable ; le moat = bibliothèque de règles affinée par client +
benchmarks inter-clients ("les sociétés comme vous paient X").

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Problème sans owner | Audit choc chiffré + timing renewal + cible CTO/CFO |
| Datadog améliore ses outils | Conflit d'intérêts structurel chez Datadog ; rester vendor-neutral multi-vendors |
| Churn post-optimisation | Guardrails continus (la facture se regonfle vite) + expansion autres vendors |
| Vantage/Sawmills descendent | Speed : occuper "audit+action" en 6–12 mois, SEO "reduce datadog bill" |

## Roadmap 8 semaines

- S1–2 : connecteur read-only + collecte (fait en v0.1)
- S3–4 : moteur de règles v1 + rapport chiffré (fait en v0.1)
- S5 : landing + audit gratuit public (landing v0.1 prête)
- S6 : 10 audits gratuits réseau → testimonials + économies réelles moyennes
- S7–8 : alertes Slack basiques + Stripe + Show HN
