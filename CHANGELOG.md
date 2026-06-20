# Changelog

All notable changes to Real Chat are recorded here. This file lives in the repo, so it is
readable by any tool or person working on the project (see "How this log is accessed" below).

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/); versions follow
[semantic versioning](https://semver.org/). The version is single-sourced from `manifest.json`.

## [1.0.1] - 2026-06-20

### Fixed
- Cleared the Obsidian directory CSS-lint warning: the fade on collapsed long replies no longer
  uses `-webkit-mask-image` (`css-masks`, only partially supported on older Obsidian). It now
  uses a gradient overlay pseudo-element, which looks the same and is broadly supported.

## [1.0.0] - 2026-06-20

Initial public release. Lean, community-store fork of the personal `gage-chat` plugin.

### Added
- Chat sidebar for any OpenAI-compatible API (DeepSeek direct, OpenRouter with live model list
  and per-model pricing, or a custom endpoint). Bring your own key.
- Five persistent chat sessions with history, archive, export, and per-session model/YOLO.
- Streaming replies, reasoning-model "Thinking" blocks, cost/token tracking, think timer.
- Vault tools: create/edit/append/rename/delete/replace notes, frontmatter and tags,
  backlinks/orphans/broken-links, word count, vault stats, date math.
- Ranked vault search: an instant 🔍 search box (toolbar button + hotkey-able command) and an
  agentic chat search that runs synonym passes.
- Web access (web search, fetch, download to vault), local image processing (compress, resize,
  convert, crop, rotate), CSV/JSON reading.
- Persistent memory with user-defined triggers; saved prompt library; inline "edit selection".
- "Jump to latest" scroll button; one-click clear-session button; Continue button when a turn
  hits the tool-step cap.

### Notes
- Differs from the personal `gage-chat` build by deliberately excluding, to comply with
  Obsidian developer policy: `shell_exec`, and the document extraction (PDF/Word/Excel) that
  relied on loading libraries from a CDN at runtime.

## How this log is accessed

This `CHANGELOG.md` is a plain file committed in the repo. Anything that can read the project
files can read it: a future Claude Code or opencode session (it just opens the file in the
working directory), any other editor or AI tool, or you. That is the point of keeping the log
here rather than in a tool's private memory — Claude Code's own memory store is only visible to
Claude Code, whereas this file is universal. Keep it updated whenever the version is bumped (the
same moment you edit `manifest.json`).
