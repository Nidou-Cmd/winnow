# telemetry-cost-audit

**Audit et réduction automatisée des factures Datadog.** Zéro dépendance Node.js (≥18).

> L'idée en une phrase : les startups Series A–B brûlent 5–50K$/mois d'observabilité dont ~30% part en gaspillage (métriques custom jamais requêtées, logs sans exclusion filters, spans APM non échantillonnées, hosts de staging monitorés 24/7) — cet outil le chiffre en dollars et produit un rapport d'audit en 2 minutes.

## Démarrage rapide

```bash
# Audit démo avec données d'exemple (aucune clé requise)
node bin/cli.mjs audit --mock --open=false

# Audit réel (lecture seule)
$env:DD_API_KEY="..."; $env:DD_APP_KEY="..."
node bin/cli.mjs audit --site=datadoghq.com

# Serveur web (landing page + API)
node bin/server.mjs
# → http://127.0.0.1:3000  puis POST /api/audit {"mode":"mock"}
```

## Déployer

### Vercel (recommandé pour la phase de validation)

Le repo contient `api/audit.mjs` (fonction serverless, maxDuration 60s) et la landing
statique dans `public/`. Les rapports sont générés à la volée et renvoyés dans la
réponse HTTP — aucun stockage disque nécessaire.

```bash
npm i -g vercel        # ou : npx vercel
vercel login
vercel --prod
```

Chaque `git push` sur la branche connectée redéploie automatiquement.

### Openship (option self-hosted / BYOC)

Le repo reste prêt pour [Openship](https://github.com/oblien/openship) : `openship.json`
à la racine + `Dockerfile`. Utile quand tu proposeras un tier "self-hosted" aux clients
entreprise (données restant dans leur org).

```bash
# Sur un VPS Linux (Hetzner / DO / OVH)
curl -fsSL https://get.openship.io | sh && openship up
# Puis importer Nidou-Cmd/telemetry-cost-audit depuis le dashboard ou :
openship deploy Nidou-Cmd/telemetry-cost-audit
```

> Le runtime self-host d'Openship héberge les apps sur **Linux** ; sous Windows,
> l'app desktop pilote un serveur Linux distant via SSH.

### Local

```bash
node bin/server.mjs          # ou : docker build -t tca . && docker run -p 3000:3000 tca
```

## Architecture

```
bin/cli.mjs            CLI d'audit (--mock | clés Datadog)
bin/server.mjs         Serveur local (landing + POST /api/audit)
api/audit.mjs          Fonction serverless Vercel (même handler que le serveur local)
src/web/audit-handler.mjs  Logique partagée : snapshot -> audit -> {totals, findings, html}
src/datadog/client.mjs Client API Datadog read-only (usage metering, attribution,
                       métriques actives, dashboards/monitors, indexes logs)
src/engine/rules.mjs   Règles d'économies v1 :
                       - orphaned-custom-metrics   (mesuré)
                       - high-cardinality-tags     (estimé)
                       - log-index exclusions/rétention (mesuré/estimé)
                       - span tail-sampling        (estimé)
                       - zombie-hosts staging      (estimé)
src/engine/engine.mjs  Orchestrateur : baseline de facture, caps par catégorie,
                       totaux min/max annualisés
src/report/html.mjs    Rapport HTML autonome chiffré ($/mois par finding)
src/mock/fixtures.mjs  Jeu de données démo réaliste (~8K$/mois de facture)
site/index.html        Landing page avec formulaire d'audit
```

## Garanties de confidentialité

- Accès **métadonnées uniquement** : aucun contenu de log ne quitte l'org Datadog.
- Clés utilisées en mémoire, jamais stockées ni loggées.
- Serveur bindé sur `127.0.0.1` par défaut.

## Limitations connues v0.1

- Le mode live croise dashboards + monitors (pas encore notebooks/SLO).
- La cardinalité exacte par métrique dépend de l'Usage Attribution API (top 500).
- Prix par défaut = liste publique Datadog ; ajuster dans `src/config/pricing.mjs`
  selon les remises contractuelles du client.

## Roadmap

- [ ] Guardrails continus : alertes Slack sur nouvelle série métrique coûteuse
- [ ] Quarantaine auto des métriques orphelines via Metrics without Limits API
- [ ] Connecteurs AWS CUR + Snowflake + OpenAI
- [ ] Stripe + auth multi-tenant, historisation des audits
- Voir `docs/STRATEGY.md` pour l'analyse marché complète.

Licence Apache-2.0.
