# Real Chat plugin — working rules

Instructions for **any agent or tool** (Claude Code, opencode, Cursor, a human,
etc.) editing this plugin. These OVERRIDE default behaviour.

Real Chat is the **public, Obsidian community-store fork** of the personal
`gage-chat` plugin (`../gage-chat`). Repo: `saorgage/real-chat`. It is a lean,
policy-compliant build — keep it that way (see "Store-policy compliance" below).

> This file is the single source of truth for the working rules. `CLAUDE.md` in
> this folder is just a pointer to it, so Claude Code and opencode (which reads
> `AGENTS.md` natively) follow the same rules. **Edit the rules here only.**

## Release & documentation rule (always follow)

Whenever you make a **user-facing change** (new feature, changed behaviour, bug
fix that a user would notice), you MUST, in the same change, keep all of these in
sync. Do not consider the task done until they match:

1. **Version** — bump `"version"` in `manifest.json` using semver (patch = bug
   fix, minor = feature, major = breaking). `main.js` reads it via
   `this.manifest.version`, so it is the single source of truth. Bumping it is
   what triggers the in-vault help note to regenerate.

2. **`versions.json`** — add an entry mapping the new version to its minimum
   Obsidian app version (match the existing entries, currently `"1.4.0"`). The
   community store requires this file; a release without its entry is broken.

3. **In-vault help note** — update the `helpContent()` method in `main.js` so it
   describes the new behaviour. It is auto-written to
   `_memory/Real Chat — How to use.md` on the next load when the version changes
   (`writeHelpIfNeeded`). This is what the USER reads in Obsidian — it is the
   priority. The array is `.join('\n')`, so verify it reads correctly as joined
   lines.

4. **README.md** — the GitHub-facing doc. Update the feature list if the change
   adds/alters a feature. (Bug fixes that don't change documented features need
   no README edit.) README has no "New in" section by convention — the CHANGELOG
   is the version history.

5. **CHANGELOG.md** — add an entry for the new version (Keep-a-Changelog style,
   `### Added` / `### Fixed` / etc.). Tool-agnostic log; read by any session/tool.

Quick self-check before finishing:
- [ ] `manifest.json` `version` bumped
- [ ] `versions.json` has a matching entry for the new version
- [ ] `helpContent()` mentions the change
- [ ] README updated if a feature changed
- [ ] `CHANGELOG.md` entry added
- [ ] `node --check main.js` passes

## Git (this folder IS a git repo)

- Branch is `main`; remote `origin` → `https://github.com/saorgage/real-chat.git`.
- Commit user-facing changes with a clear message and the version in it. Only
  commit/push when the user asks. End commit messages with the standard
  `Co-Authored-By` trailer when committing on the user's behalf.
- `data.json` is the user's live local settings/keys — it is git-ignored or must
  never be committed. Never commit secrets.

## Store-policy compliance (do not regress)

Real Chat deliberately removed, for Obsidian developer-policy compliance:
- `shell_exec` (running terminal commands), and
- the PDF/Word/Excel document extraction that loaded parsing libraries from a CDN
  **at runtime**.

Do NOT reintroduce runtime remote-code loading or arbitrary shell execution. New
features must be self-contained (no CDN-`eval`, no remote scripts). Anything that
needs those belongs in the private `gage-chat` build, not here.

## Other notes

- Single-file plugin: all logic is in `main.js` (no build step). Edit it directly.
- Styling is in `styles.css`; use existing `--var(...)` theme tokens, not
  hard-coded colours.
- Must work on mobile (`IS_MOBILE`): keep any desktop-only code gated.
