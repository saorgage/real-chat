# Real Chat

A chat sidebar for Obsidian that works with **any OpenAI-compatible API** — DeepSeek, OpenRouter (300+ models including Claude, GPT and Gemini), or your own endpoint. Bring your own key. It reads and edits your notes, searches your vault, browses the web, and works with images — all from a conversation in the sidebar.

> Real Chat is free and MIT-licensed. Source: [saorgage/real-chat](https://github.com/saorgage/real-chat).

## Start here

- **[Setup](Setup)** — install, pick a provider, paste your key.
- **[Usage](Usage)** — sessions, context, search, slash commands, inline edit, keys.
- **[Vision & Images](Vision-and-Images)** — paste a picture and have the model see *and* act on it.
- **[Tools & Vault Actions](Tools-and-Vault-Actions)** — what it can do to your notes, plus web access.
- **[Memory & Triggers](Memory-and-Triggers)** — persistent memory and custom commands.

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