# Changelog

> **Rule**: This wiki changelog must be updated simultaneously with every release. Whenever `CHANGELOG.md` in the main repo is updated, this page must be updated to match. The wiki is the public-facing documentation, and users rely on it for accurate information about features and fixes.

All notable changes to Real Chat are recorded here. For the canonical source, see [CHANGELOG.md in the repository](https://github.com/saorgage/real-chat/blob/main/CHANGELOG.md).

The format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [semantic versioning](https://semver.org/).

## [1.2.1] - 2026-11-20

### Fixed
- Handle streamed `delta.content` arrays by appending their text blocks instead of rendering `[object Object]`.

## [1.1.3] - 2026-06-25

### Fixed
- **Expanded character sanitisation to prevent intermittent "400 — Invalid character" errors.**
  `sanitizeText` (previously `stripLoneSurrogates`) now also strips C0/C1 control characters (except
  `\t`, `\n`, `\r`) and Unicode noncharacters (`U+FDD0`–`U+FDEF`, `U+FFFE`–`U+FFFF`) from every
  outgoing message and search snippet. These additional character classes can appear in corrupted
  clipboard data or damaged note content and, like lone surrogates, cause the API to reject the
  entire request. The broader pass eliminates the occasional "Real Chat error: 400" popup during
  normal chat.

## [1.1.2] - 2026-06-25

### Fixed
- **The "Apply changes" confirmation dialog dismissed (as a silent cancel) on a slight misclick.**
  `ConfirmModal` extends Obsidian's `Modal`, which closes on a click anywhere on the dimmed backdrop;
  `onClose` then treats any non-explicit close as `onConfirm(false)`, so a near-miss click cancelled the
  pending edit with no feedback. Added a capture-phase click guard on `containerEl` that swallows clicks
  landing outside `modalEl`, so only the explicit **Cancel** / **Apply changes** buttons (or Escape) decide.
  The guard is removed in `onClose`.

## [1.1.1] - 2026-06-21

### Fixed
- **"lone leading surrogate in hex escape" (HTTP 400) could brick a chat session.** The ranked
  vault-search snippet was sliced at fixed character offsets (`body.slice(at-60, at+120)`), which
  could cut through a surrogate pair (e.g. an emoji in a note), leaving a half-character. That
  broken snippet got saved into the session as a `tool` result, so every later message re-sent it
  and the provider rejected the whole request. Two-part fix: the snippet is now surrogate-safe, and
  a `stripLoneSurrogates` (now `sanitizeText`) pass cleans every outgoing message (system/user/assistant/tool)
  at the API boundary — so any corrupted text (truncated emoji, bad paste, a poisoned note) can no longer
  400 the request. Valid emoji and characters are preserved.

## [1.1.0] - 2026-06-21

### Added
- **Vision model now runs the full tool loop — see *and* act on an image in one turn.** When the
  active chat model can't see an attached image (e.g. DeepSeek), the turn routes through the
  configured vision provider (Gemini etc.) *with the complete tool set*, instead of the old
  describe-only vision turn. So the model can save the image, OCR it into a note, create/edit
  notes and search — all from one message. (Verified end-to-end that Gemini 2.5 Flash via the
  OpenAI-compat endpoint handles vision + tools + streaming + multi-step tool results together.)
- New `save_attached_image` tool: writes the *actual* pasted/attached image bytes into the vault
  (decodes the in-memory data URL → `createBinary`), inferring the extension from the MIME type
  and defaulting to the download folder. Returns a clickable `![[path]]`. Only offered to the
  model when an image is actually attached.

### Fixed
- **Pasted/attached images were unusable on follow-up turns.** The vision turn only fired when the
  *latest* user message carried the image, and attachments were cleared after every send. So
  "paste image + ask" reached the vision model, but any follow-up routed to a model that can't see
  images and would confabulate that no image was passed. Images are now **sticky**: the chip
  persists across turns so every follow-up keeps reaching the vision model. Tap × to remove.
- `buildContextPrefix` appended `a.content` for image attachments, which have no `.content`,
  injecting the literal string `"undefined"` into the message text on every image turn.

### Removed
- The standalone `runVisionTurn` / `callVisionStream` methods, now superseded by the unified
  tool-loop path (the vision provider is just an alternate driver for the normal loop).

## [1.0.2] - 2026-06-20

### Added
- `fundingUrl` in `manifest.json` (GitHub Sponsors and Ko-fi) so Obsidian shows a Support link
  on the plugin page. README badges alone don't surface in Obsidian's plugin viewer.

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
