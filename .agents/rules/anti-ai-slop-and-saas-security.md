# Project Rule: Anti-AI Slop Design & Modern SaaS Security Stack

This project strictly adheres to modern anti-slop UI design practices and enterprise SaaS security standards.

---

## 1. Anti-AI Slop Design System (TweakCN + shadcn/ui + Radix + Mantine)

* **Design Tokens & Theme Locking**: Use CSS variables (`var(--bg-canvas)`, `var(--bg-surface)`, `var(--accent)`, `var(--border-subtle)`) with accessible contrast tokens generated via **TweakCN** (`https://tweakcn.com`).
* **Component Architecture**: Build components on `shadcn/ui` + `Radix UI` headless primitives. For complex controls (Rich Text, Calendars, Segmented Controls), use `Mantine`. For cross-platform code, use `gluestack-ui`.
* **Agent Guardrails**: Enforce **Impeccable** (`npx impeccable install`, `/impeccable init`), **Tastemaker** system locking, and **Taste Skill** anti-pattern rules.
* **Visual Standards**:
  - **No Generic Colors**: Avoid raw `#0000ff` or default unstyled Tailwind colors.
  - **Typography**: Modern Google Fonts (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`) with fluid `clamp()`.
  - **Micro-Interactions**: Smooth hover scaling, `cubic-bezier` transitions, backdrop blur glassmorphism, and custom focus rings.

---

## 2. SaaS Security Architecture (SuperTokens + Infisical + Authentik + Casbin/CASL)

* **Authentication**: Use **SuperTokens** for session management with anti-hijacking token rotation, OAuth, and MFA.
* **Secrets & Env Sync**: Use **Infisical** to manage and sync `.env` secrets across Vercel, Supabase, Cloudflare, and local dev.
* **Reverse Proxy SSO**: Use **Authentik** / **Keycloak** to protect staging and admin backoffice endpoints.
* **Fine-Grained Authorization**: Use **Casbin** for Python/FastAPI backends (PERM model) and **CASL** (`ability.can()`) for React/JS frontend.
