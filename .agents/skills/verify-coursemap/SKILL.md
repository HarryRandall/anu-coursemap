---
name: verify-coursemap
description: Run and report the complete Coursemap quality gate. Use before committing, opening or merging a pull request, after dependency or database changes, and whenever a user asks whether the repository is healthy or ready to deploy.
---

# Verify Coursemap

## Overview

Validate the smallest relevant scope during development, then run the full reproducible gate before hand-off. Report exactly what passed, failed or could not be verified.

## Fast feedback

Run these while iterating:

```bash
npm run lint
npm run typecheck
npm test
```

Run focused test commands where the repository provides them. Do not describe a static check as runtime proof.

## Full gate

From a clean install when practical, run:

```bash
npm run verify
```

When Supabase files changed, also run migration tests, regenerate database types and review the linked project's security and performance advisers. When UI behaviour changed, smoke-test the affected desktop and mobile flows in a real browser.

## Reporting

- Name each command and its outcome.
- Separate focused checks from the full gate.
- State when network, credentials or an unavailable service prevented verification.
- Include warnings that affect deployment even if the command exited successfully.
- Do not claim production readiness while migrations, environment variables or external redirects remain unapplied.
