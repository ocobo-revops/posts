# setup

Take a brand-new macOS contributor from a fresh machine to "ready to run `/new-content`" — install and connect everything this repo needs to author content and open PRs.

## When to invoke

When someone on macOS is setting up this repo for the first time and wants the content-authoring workflow working end to end. Scope is deliberately narrow: **macOS + Homebrew**, and **this repo only** — authoring content and opening PRs against `ocobo-revops/posts`. No website repo, no broader Ocobo tooling.

## How to behave

The contributor may be **non-technical**. Run the diagnostic commands for them, read the output, and explain what you find in plain language. Never make them paste commands they don't understand.

**Be idempotent — check before you install.** For every prerequisite, detect what's already present first and skip it. Never reinstall blindly. Tell the user "already installed (vX.Y) ✓" or "missing — installing now".

Work through the steps in order. If a step fails, stop, show the error, and resolve it before moving on — a later step usually depends on an earlier one.

## 1. Homebrew

```bash
command -v brew && brew --version
```

If present, say so and continue. If missing, do **not** install it silently — point the user to the official command and let them run it (it prompts for the macOS password):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, follow Homebrew's printed instructions to add `brew` to the shell `PATH`, then re-check `brew --version`.

## 2. Node.js 24

CI pins Node 24 — match it locally.

```bash
node -v
```

If it already reports `v24.x`, skip. Otherwise:

```bash
brew install node@24
```

`node@24` is keg-only, so it isn't on `PATH` by default. **Use the exact path `brew install` prints** — it differs by Mac: `/opt/homebrew/opt/node@24/bin` on Apple Silicon, `/usr/local/opt/node@24/bin` on Intel. Append it to the shell profile, e.g. on Apple Silicon:

```bash
echo 'export PATH="/opt/homebrew/opt/node@24/bin:$PATH"' >> ~/.zshrc
```

Open a new shell, then verify:

```bash
node -v   # expect v24.x
```

## 3. pnpm 8

CI pins pnpm 8 — this repo uses pnpm, not npm or yarn.

```bash
pnpm -v
```

If it already reports `8.x`, skip. Otherwise:

```bash
brew install pnpm
pnpm -v   # expect 8.x
```

If `brew` installs a newer major (9.x, 10.x), that's fine for pure authoring — but warn the user that **changing dependencies** with a mismatched pnpm can regenerate `pnpm-lock.yaml` in a format CI's `--frozen-lockfile` (pinned to 8) rejects. If they only author content, the pin doesn't bite.

## 4. GitHub CLI

`publish-content` opens PRs with `gh`, so it must be installed **and authenticated**.

```bash
gh --version
```

If missing:

```bash
brew install gh
```

Then check auth — this is the part people skip:

```bash
gh auth status
```

If it reports not logged in, run the interactive login and walk the user through the browser prompts (choose GitHub.com → HTTPS → authenticate via browser):

```bash
gh auth login
```

Re-run `gh auth status` afterwards and confirm it shows a clean, logged-in state for `github.com` before continuing.

## 5. Clone + install

If you're not already inside the repo (`git remote -v` doesn't show `ocobo-revops/posts`), clone it into a directory the user picks:

```bash
gh repo clone ocobo-revops/posts
cd posts
```

If already inside it, skip the clone. Either way, install dependencies to green:

```bash
pnpm install
```

If `pnpm install` fails, stop and show the error — do not proceed to validation.

## 6. Claude Code + skills

Confirm Claude Code is installed (the user is running it now if they reached this skill). Confirm the repo's authoring skills are discoverable:

```bash
ls .claude/skills/
```

You should see `new-content`, `publish-content`, `translate-content`, and `setup`. If they're missing, the clone or `cd` went wrong — re-check step 5.

## 7. Notion MCP (optional)

The Notion MCP lets `new-content` import pages directly from the Ocobo Notion workspace. **It is optional** — interview mode and local-file mode both work without it, so this is never a blocker.

Offer it: "Want to set up Notion import? It's optional — you can author content without it." If yes, point the user to `docs/mcp-notion-setup.md` (it's a claude.ai Settings → Integrations flow, not a terminal step). If no, move on.

## 8. No local Blob token

Tell the user explicitly: **you do NOT need any Vercel Blob token locally.** Image upload to Vercel Blob is handled by CI when a PR is opened — the workflow uses a repo secret (`NEW_BLOB_READ_WRITE_TOKEN`), not anything on your machine. `pnpm validate` may flag local image paths before that sync runs — that's expected, not an error to fix.

## You're ready

Print a short summary of what's now in place, for example:

```
Setup complete ✓
  Homebrew      ✓
  Node          v24.x
  pnpm          8.x
  GitHub CLI    authenticated as <user>
  Dependencies  installed
  Skills        new-content, publish-content, translate-content, setup
  Notion MCP    <connected | skipped (optional)>
  Blob token    not needed locally — CI handles uploads

Next: run /new-content to create your first piece of content.
```

Then tell them to run `/new-content` to start authoring.
