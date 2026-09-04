---
name: anti-ai-slop-design
description: >-
  Use this skill whenever designing, building, or auditing frontend UI/UX in Next.js, React, Vue, or web apps.
  Implements modern anti-slop design practices with TweakCN theme locking, shadcn/ui, Radix UI primitives,
  Mantine, gluestack UI, Tastemaker design system locking, and Taste Skill rules for typography, layout, motion, and micro-interactions.
---

# Anti-AI Slop Design System & UI Architecture

This skill provides comprehensive patterns to eliminate generic, template-looking AI UI ("AI Slop") and replace it with distinctive, production-grade visual design systems.

---

## 1. UI Libraries & Design Systems

### TweakCN
* **Site**: [https://tweakcn.com](https://tweakcn.com) | **GitHub**: [jnsahaj/tweakcn](https://github.com/jnsahaj/tweakcn)
* **Usage**: Visual theme editor for `shadcn/ui`. Generates accessible HSL/OKLCH color palettes and CSS variables from a single brand color.

### shadcn/ui
* **Site**: [https://ui.shadcn.com](https://ui.shadcn.com) | **GitHub**: [shadcn-ui/ui](https://github.com/shadcn-ui/ui)
* **Usage**: Copyable, fully customizable components built on Radix Primitives + Tailwind CSS.

### Radix UI
* **Site**: [https://www.radix-ui.com](https://www.radix-ui.com) | **GitHub**: [radix-ui/primitives](https://github.com/radix-ui/primitives)
* **Usage**: Unstyled, accessible headless primitives (Dialog, DropdownMenu, Popover, Accordion, Tabs, Tooltip).

### Mantine UI
* **Site**: [https://mantine.dev](https://mantine.dev) | **GitHub**: [mantinedev/mantine](https://github.com/mantinedev/mantine)
* **Usage**: Feature-complete React library for specialized UI components (Rich Text Editor, Dates/Calendars, Dropzone, MultiSelect, SegmentedControl).

### gluestack-ui
* **Site**: [https://gluestack.io](https://gluestack.io) | **GitHub**: [gluestack/gluestack-ui](https://github.com/gluestack/gluestack-ui)
* **Usage**: Universal type-safe component library for cross-platform apps (Web + React Native / Expo).

---

## 2. AI Agent Guardrails (Anti-Slop Stack)

| Tool | Purpose | Integration |
|---|---|---|
| **Impeccable** | 1 skill, 23 commands, 61 anti-pattern detectors | Run `npx impeccable install` & `/impeccable init` |
| **Tastemaker** | Lock design system rules BEFORE code generation | Create pre-prompt design specs |
| **Taste Skill** | Guidelines for layout, typography, motion, spacing | Import Taste rules into agent prompts |
| **OpenDesign** | Desktop guardrails & 250+ UI skills | Desktop AI UI execution engine |
