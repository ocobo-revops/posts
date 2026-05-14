# Plan : renommer le repo `posts`

Objectif : renommer `ocobo-revops/posts` vers un nom plus pertinent (reco : `content`) sans casser le website Ocobo qui consomme ce repo via l'API GitHub.

## Contexte technique

- Le website lit le contenu via `https://api.github.com/repos/${GITHUB_ACCOUNT}/${GITHUB_REPO}/contents` — construit dans `website/app/modules/env.server.ts:55`.
- Un seul point de bascule runtime : la var d'env `GITHUB_REPO` côté Vercel.
- Les URLs Vercel Blob (assets dans les `.md`) ne contiennent pas le nom du repo → intactes.
- GitHub crée un redirect automatique après rename (git remotes + API REST), mais on ne s'y appuie pas pour la prod.

## Checklist

### 0. Pré-flight (avant de toucher quoi que ce soit)

- [ ] Geler le nouveau nom (reco : `content` — reflète `CONTEXT.md`, où "Content" est l'umbrella term)
- [ ] `but status` + `gh pr list --repo ocobo-revops/posts` → merger/fermer ce qui peut l'être pour ne pas réconcilier après
- [ ] Noter les intégrations connectées (Vercel, GitHub Apps, webhooks éventuels) — GitHub → Settings → Webhooks / Integrations

### 1. Bascule GitHub + prod (fenêtre courte, dans l'ordre)

- [ ] GitHub → `ocobo-revops/posts` → Settings → Rename → `<nouveau-nom>`
- [ ] Vercel project `website` → Environment Variables : `GITHUB_REPO=<nouveau-nom>` sur **Production + Preview + Development**
- [ ] Redeploy prod + smoke test `/blog`

### 2. Local dev

- [ ] `~/projects/ocobo/website/.env` → `GITHUB_REPO=<nouveau-nom>`
- [ ] `mv ~/projects/ocobo/posts ~/projects/ocobo/<nouveau-nom>` (requis : `env.server.ts:56` construit `localeRepoAPIUrl` à partir de `~/projects/ocobo/${githubRepo}`)
- [ ] Dans le repo renommé : `git remote set-url origin git@github.com:ocobo-revops/<nouveau-nom>.git` (vérifier avec `git remote -v`)

### 3. Nettoyage refs (à faire dans des PRs)

PR sur le repo renommé :
- [ ] `package.json` : `name` (`ocobo-posts` → `ocobo-<nouveau-nom>`), `repository.url` (legacy `wab/ocobo-posts` → `ocobo-revops/<nouveau-nom>`)
- [ ] `README.md` : titre "Ocobo Posts Repository"
- [ ] `CONTEXT.md:47` : mention "ocobo-posts"

PR sur le website :
- [ ] `scripts/setup-migration.md:43`
- [ ] `scripts/update-frontmatter-local.js:129,169`

### 4. Validation

- [ ] Vercel → project `website` → Settings → Git : confirmer que le linked repo affiche le nouveau nom
- [ ] Smoke test prod : `/blog`, une page article, `/stories`, `/jobs`, `/sitemap.xml`
- [ ] Faire un commit dummy sur le repo renommé pour vérifier que le deploy hook Vercel suit toujours

### 5. Optionnel

- [ ] Créer un repo placeholder vide `ocobo-revops/posts` pour bloquer le squatting et garantir que le redirect GitHub ne sera jamais cassé par un futur repo de même nom

## Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Vercel sert un 404 entre le rename et le redeploy | Prod down quelques minutes | Faire rename + update env var + redeploy dans la même fenêtre. GitHub renvoie 301 que `fetch` suit, mais ne pas s'y fier longtemps. |
| Quelqu'un recrée un repo `ocobo-revops/posts` plus tard | Casse le redirect GitHub | Faible (org privée). Optionnel : placeholder (cf. section 5). |
| Vercel deploy-hook / GitHub App liés au repo | Aucun en pratique — GitHub conserve l'ID interne | Vérifier que l'intégration Vercel "Git repo" affiche bien le nouveau nom après rename (#13). |
| PRs / branches GitButler ouvertes au moment du rename | Auto-redirigées | Vérifier les lanes actives, refaire `but pull` après rename. |

## Chemin critique

Étapes 1.1 → 1.2 → 1.3 (rename GitHub → update env var Vercel → redeploy) doivent s'enchaîner sans interruption.
Tout le reste est fait à froid après.
