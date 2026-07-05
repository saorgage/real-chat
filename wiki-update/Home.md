# Real Chat

A chat sidebar for Obsidian that works with **any OpenAI-compatible API** — DeepSeek, OpenRouter (300+ models including Claude, GPT and Gemini), or your own endpoint. Bring your own key. It reads and edits your notes, searches your vault, browses the web, and works with images — all from a conversation in the sidebar.

> Real Chat is free and MIT-licensed. Source: [saorgage/real-chat](https://github.com/saorgage/real-chat).

## New in 1.1.3

**Expanded character sanitisation to prevent intermittent "400 — Invalid character" errors.** The sanitisation pass now strips C0/C1 control characters (except `\t`, `\n`, `\r`) and Unicode noncharacters (`U+FDD0`–`U+FDEF`, `U+FFFE`–`U+FFFF`) from every outgoing message and search snippet, in addition to lone UTF-16 surrogates. These character classes can appear in corrupted clipboard data or damaged note content and cause the API to reject the entire request. The broader pass eliminates occasional "Real Chat error: 400" popups during normal chat.

## New in 1.1.2

**The "Apply changes" confirmation dialog no longer dismisses on a slight misclick.** Previously, clicking near the dialog would silently cancel it. Now only the explicit **Cancel** / **Apply changes** buttons (or Escape) decide the outcome.

## New in 1.1.1

**Fixed "lone leading surrogate in hex escape" (HTTP 400) that could brick a chat session.** The ranked vault-search snippet is now surrogate-safe, and a `sanitizeText` pass cleans every outgoing message (system/user/assistant/tool) at the API boundary. Any corrupted text (truncated emoji, bad paste, poisoned note) can no longer cause 400 errors.

## New in 1.1.0

**The vision model now runs the full tool loop — see *and* act on an image in one turn.** When your chat model can't see an attached image (e.g. DeepSeek), the turn routes through your configured vision provider (Gemini, etc.) *with the complete tool set*. So "save this screenshot and tell me what it says" saves the real picture into your vault (via the new `save_attached_image` tool) **and** reads it back — in a single message. Attached images are now **sticky** too, so follow-up questions keep reaching the vision model. See **[Vision & Images](Vision-and-Images)**. Full history: [Changelog](Changelog).

## Start here

- **[Setup](Setup)** — install, pick a provider, paste your key.
- **[Usage](Usage)** — sessions, context, search, slash commands, inline edit, keys.
- **[Vision & Images](Vision-and-Images)** — paste a picture and have the model see *and* act on it.
- **[Tools & Vault Actions](Tools-and-Vault-Actions)** — what it can do to your notes, plus web access.
- **[Memory & Triggers](Memory-and-Triggers)** — persistent memory and custom commands.
- **[Changelog](Changelog)** — full release history and details.

## What it does

- **Five chat sessions**, each with its own history, draft, model and settings. Histories persist across restarts; archive and reload past chats; export a chat to a note.
- **Any OpenAI-compatible provider** — DeepSeek direct (cache-aware pricing) or OpenRouter (live model list, per-model pricing, favourites). Per-session model selection.
- **Acts in your vault** — create, edit, append, rename, delete and find/replace notes; frontmatter and tag editing; backlinks, orphans and broken-link finders; word count and vault stats. File changes prompt for confirmation (or enable YOLO mode to skip).
- **Ranked vault search** — a 🔍 search box (toolbar button or hotkey-able command) for instant, token-free results; or ask in chat for synonym-expanded, reasoned search.
- **Web access** (optional) — web search, fetch a page, download a file into your vault.
- **Images** — paste, drag or attach; process locally (compress, resize, convert, crop, rotate); or have a vision model see them. See **[Vision & Images](Vision-and-Images)**.
- **Persistent memory & triggers**, **reasoning-model thinking blocks**, **cost tracking**, **streaming**, **slash commands**, a **saved prompt library**, and **inline "edit selection"** from any note.

## Privacy

Real Chat only makes the network requests you configure or trigger. Your messages and any note content you add as context go to the **API provider you choose**; web access (off unless enabled) talks to your search provider and any URLs you/the model fetch. No telemetry, no other data collection. API keys live in the plugin's local `data.json` and are sent only to the provider they belong to. See [Privacy & network use](https://github.com/saorgage/real-chat#privacy--network-use) in the README.
