# Real Chat plugin — working rules

**The working rules for this plugin live in [`AGENTS.md`](./AGENTS.md) in this
same folder. Read it before editing anything here — those rules OVERRIDE default
behaviour.**

`AGENTS.md` is the single source of truth (release/versioning discipline incl.
`versions.json`, the docs that must stay in sync, git commit/push rules, and the
Obsidian store-policy constraints — no runtime CDN loading, no `shell_exec`). It
is kept under that name so non-Claude tools like opencode — which read
`AGENTS.md` natively — follow the exact same rules. Update the rules in
`AGENTS.md` only; do not duplicate them here.
