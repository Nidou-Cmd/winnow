# Winnow FinOps & Cyber Defense (Official Nidou-Cmd Production v2.0)

**Séparez les signaux de la dépense & neutralisez les fuites de secrets dans la télémétrie.**  
Audit automatisé des coûts Datadog & AWS, Scanner DLP temps réel, et Remédiation GitOps (Terraform). Zéro dépendance Node.js (≥18).

> **Le nom :** *winnow* = vanner, séparer le grain de l'ivraie. Winnow sépare les signaux utiles du gaspillage financier tout en bloquant l'exfiltration de secrets cloud (clés AWS, tokens GitHub, PII) dans vos métriques et logs.

### 🛡️ Les Nouveautés Cybersécurité & Enterprise v2.0 :
- **Zero-Knowledge Crypto Vault :** Chiffrement enveloppe AES-256-GCM + BYOK (AWS KMS / Vault), destruction éphémère des clés en mémoire RAM (`Buffer.fill(0)`).
- **Scanner DLP Télémétrie :** Détection proactive des clés AWS, tokens GitHub, JWT et données RGPD/PCI-DSS dans vos tags de métriques.
- **Remédiation GitOps Zéro-Droit d'Écriture :** Génération automatique de Pull Requests Terraform / OpenTofu (aucun droit d'écriture requis).
- **Registre Cryptographique Immuable (WORM) :** Preuve d'intégrité par chaîne de hachage SHA-256 (conforme SOC 2 Type II, ISO 27001, HIPAA).
- **Mode In-VPC / Air-Gapped :** Exécution 100% locale dans votre réseau privé avec garantie Zéro-Exfiltration.

## Démarrage rapide

```bash
# Audit FinOps & Cyber démo avec scan DLP (sans clé requise)
npm run audit:cyber

# Audit réel en lecture seule
$env:DD_API_KEY="..."; $env:DD_APP_KEY="..."
node bin/cli.mjs audit --site=datadoghq.com

# Serveur web interactif (Dashboard + CISO Center + API)
npm start
# → http://127.0.0.1:3000
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
# Puis importer Nidou-Cmd/winnow depuis le dashboard ou :
openship deploy Nidou-Cmd/winnow
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
