---
name: impeccable-design-engine
description: >-
  Use this skill when installing, running, or auditing UI designs using Impeccable (pbakaus/impeccable).
  Features 23 commands and 61 anti-pattern detectors to enforce high-converting, state-of-the-art UI/UX.
---

# Impeccable Design Engine

[Impeccable](https://github.com/pbakaus/impeccable) is an AI agent design engine that acts as a quality gatekeeper for frontend web design, preventing generic AI output and enforcing strict visual, accessibility, and interaction standards.

---

## 1. Quick Setup & Commands

```bash
# Install Impeccable CLI & Skill
npx impeccable install

# Initialize design system rules in current project
/impeccable init
```

---

## 2. Core Command Reference (23 Commands)

| Command | Purpose |
|---|---|
| `/impeccable init` | Scaffolds `.impeccable/` directory and locks design tokens |
| `/impeccable audit` | Runs all 61 anti-pattern detectors on HTML/JSX/CSS |
| `/impeccable theme` | Validates color contrast ratios (WCAG AAA) and CSS variables |
| `/impeccable typography` | Verifies font scale, line-height, and `clamp()` fluid sizing |
| `/impeccable layout` | Audits alignment, flex/grid container bounds, and padding |
| `/impeccable contrast` | Flags inaccessible text/background pairings |
| `/impeccable a11y` | Validates WAI-ARIA labels, focus outlines, and alt text |
