---
name: saas-security-architecture
description: >-
  Use this skill whenever implementing authentication, authorization, secret management, identity providers,
  or security policies in SaaS applications. Covers SuperTokens auth, Keycloak IAM, Authentik SSO reverse-proxy,
  Infisical secrets manager, Casbin (FastAPI), CASL (isomorphic JS), Open Policy Agent (OPA), and AWS Cedar.
---

# Enterprise SaaS Security Architecture & Zero-Trust Stack

This skill defines standard security patterns, authentication, fine-grained authorization, secrets management, and reverse-proxy SSO setups for production SaaS applications.

---

## 1. Authentication & Identity Management

### SuperTokens
* **Site**: [https://supertokens.com](https://supertokens.com) | **GitHub**: [supertokens/supertokens-core](https://github.com/supertokens/supertokens-core)
* **Role**: Embedded authentication engine for React / Next.js / Node.js / Python.

### Keycloak
* **Site**: [https://www.keycloak.org](https://www.keycloak.org) | **GitHub**: [keycloak/keycloak](https://github.com/keycloak/keycloak)
* **Role**: Enterprise Identity & Access Management (IAM).

### Authentik
* **Site**: [https://goauthentik.io](https://goauthentik.io) | **GitHub**: [goauthentik/authentik](https://github.com/goauthentik/authentik)
* **Role**: Reverse-proxy identity provider for self-hosted VPS / Docker infrastructure.

### Infisical
* **Site**: [https://infisical.com](https://infisical.com) | **GitHub**: [infisical/infisical](https://github.com/infisical/infisical)
* **Role**: End-to-end encrypted secret management & privileged access control.

---

## 2. Fine-Grained Authorization (RBAC / ABAC / ReBAC)

### Casbin (FastAPI / Backend)
* **Site**: [https://casbin.org](https://casbin.org) | **GitHub**: [casbin/casbin](https://github.com/casbin/casbin)

### CASL (Isomorphic JavaScript / React)
* **Site**: [https://casl.js.org](https://casl.js.org) | **GitHub**: [stalniy/casl](https://github.com/stalniy/casl)

### Open Policy Agent (OPA)
* **Site**: [https://www.openpolicyagent.org](https://www.openpolicyagent.org) | **GitHub**: [open-policy-agent/opa](https://github.com/open-policy-agent/opa)

### Cedar (AWS Cedar Policy Language)
* **Site**: [AWS Cedar](https://github.com/cedar-policy/cedar) | **GitHub**: [cedar-policy/cedar](https://github.com/cedar-policy/cedar)
