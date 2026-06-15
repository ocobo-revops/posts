# publish-content

Publish a new content file as a validated PR against `main`.

## When to invoke

After you have written a new content file (via `new-content` or manually) and are ready to open a PR. Run this skill from the repo root.

## Preconditions (check all before doing anything)

1. **Clean working tree** — `git status --porcelain` must output only the new content file(s) and their assets. If there are unrelated changes, stop and ask the user to stash or commit them first.
2. **On main, up to date** — `git rev-parse --abbrev-ref HEAD` must be `main`. `git fetch origin && git status` must show "up to date". If not, stop and ask the user to pull.
3. **pnpm validate passes** — run `pnpm validate`. If it fails, show the errors and stop. Do not open a PR against a broken content file.

If any precondition fails, explain clearly which one and how to fix it.

## Determine type and slug

Extract from the file path:
- `blog/fr/<slug>.md` → type `blog-post`, lang `fr`
- `blog/en/<slug>.md` → type `blog-post`, lang `en`
- `stories/fr/<slug>.md` → type `story`
- `team/<slug>.md` → type `team-member`
- `tools/<slug>.md` → type `tool`
- `jobs/fr/<slug>.md` → type `job`

## Run sync-assets

```bash
pnpm sync-assets
```

If any asset upload fails, stop and show the error. Do not proceed with a missing asset.

## Branch, commit, push

```bash
git checkout -b content/<type>-<slug>
git add <content-file> [asset files]
git commit -m "feat(<type>): add <slug>"
git push -u origin content/<type>-<slug>
```

## Open PR

```bash
gh pr create \
  --title "feat(<type>): add <slug>" \
  --body "$(cat <<'EOF'
## Content

- **Type:** <type>
- **Slug:** <slug>
- **Language:** <lang or N/A>
- **Source:** <Notion URL if imported, or "interview", or "local file: <path>">

## Files added

- `<content file path>`
- `<asset paths if any>`

## Review checklist

- [ ] Frontmatter fields are accurate and complete
- [ ] Slug is unique within its type directory
- [ ] Cross-references (author, hiringContact, tools, featuredTool) point to existing slugs
- [ ] Images are uploaded to Vercel Blob and URLs are in the frontmatter
- [ ] French content is in `fr/` and English in `en/` (path-based types)
- [ ] `pnpm validate` passes on this branch
EOF
)"
```

## On success

Confirm the PR URL to the user and remind them: corrections go in the markdown file directly, not back in Notion.
