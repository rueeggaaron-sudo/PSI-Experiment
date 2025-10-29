## Deployment Flow

1) **Branches & Domains**
   - `dev` → Pre-Production (Vercel: `psi-experiment-preproduction.vercel.app`)
   - `main` → Production (Vercel: `psi-experiment.vercel.app`)

2) **Pull Requests**
   - Feature-Branch → **PR nach `dev`** (Preview & Test).
   - Release → **PR `dev` → `main`** (geht live).
   - `main` ist geschützt: PR + 1 Approval + erfolgreicher **Vercel**-Build sind Pflicht.

3) **Mergen**
   - In PRs **Squash** bevorzugen (saubere History).
   - Kein direkter Push auf `main`; `dev` bleibt frei für Tests.
