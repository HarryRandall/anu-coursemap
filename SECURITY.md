# Security policy

Coursemap is a private alpha and does not yet offer a public bug bounty.

Report a suspected vulnerability privately to the repository owner. Do not open a public issue or include credentials, personal data or exploit details in a pull request.

## Supported version

Only the current `main` branch is supported.

## Secrets

Never commit `.env.local`, Supabase service-role keys, database passwords, access tokens or Vercel tokens. If a secret is exposed, rotate it immediately and remove it from every active environment. Rewriting Git history is not a substitute for rotation.
