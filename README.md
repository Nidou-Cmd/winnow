# ⚙️ Winnow - Zero-Trust API Gateway
> **Tech Stack :** Node.js 22, Express, Redis, Docker, CASL, Infisical.
> **Status:** Production-Ready (ISO 27001 Aligned)

## Fonctionnalités
- **Dashboard API** : Interface de monitoring des accès en temps réel.
- **Infisical Integration** : Panneau d'administration de la sécurité pour forcer la rotation des clés d'API de l'infrastructure globale.
- **Sécurité Docker** : Conteneur durci (Read-only FS, pas de nouveaux privilèges).

## Déploiement
Déploiement sur serveur privé (VPS) avec Docker Compose (Redis In-Memory inclus).

```bash
# Démarrage de l'infrastructure
docker-compose up -d --build
```
