# Real Chat

A chat sidebar for Obsidian that works with **any OpenAI-compatible API** — DeepSeek,
OpenRouter (300+ models including Claude, GPT and Gemini), or your own endpoint. Bring your
own key. It can read and edit your notes, search your vault, browse the web, and process
images, all from a conversation in the sidebar.

## Features

- **Five chat sessions** with their own history, draft, model and settings. Histories persist
  across restarts; archive and reload past chats; export a chat to a note.
- **Any OpenAI-compatible provider** — DeepSeek direct (cache-aware pricing) or OpenRouter
  (live model list, per-model pricing, favourites). Per-session model selection.
- **Acts in your vault** — create, edit, append, rename, delete and find/replace notes;
  frontmatter and tag editing; backlinks, orphans and broken-link finders; word count and
  vault stats. File changes prompt for confirmation (or enable YOLO mode to skip).
- **Ranked vault search** — a 🔍 search box (toolbar button or hotkey-able command) for instant,
  token-free results weighted by title/heading/tag/body; or ask in chat for synonym-expanded,
  reasoned search.
- **Web access** (optional) — web search, fetch a page, and download a file into your vault.
  DuckDuckGo needs no key; add a Brave or Tavily key for better search.
- **Images** — paste, drag or attach images; processed locally (compress, resize, convert,
  crop, rotate). Vision input routes to a natively multimodal model, or a vision provider you
  configure.
- **Persistent memory & triggers** — a memory note read on every message, with user-defined
  command "triggers".
- **Reasoning models** — chain-of-thought shows in a collapsible block (display only).
- **Cost tracking**, streaming, slash commands, a saved prompt library, and inline "edit
  selection" from any note.

Support
Real Chat is free, MIT-licensed, and built in the evenings around a full-time job. If it's earned a place in your vault and you'd like to help keep it going, any support means more time spent fixing bugs and shipping features.
💜 Sponsor me on GitHub  ·  ☕ Buy me a coffee on Ko-fi
Every bit genuinely helps. Thank you.
  
## Install

### From the Community Plugins store
Once accepted: Settings → Community plugins → Browse → search "Real Chat" → Install → Enable.

### Manual install
1. Download `main.js`, `manifest.json` and `styles.css` from the latest
   [release](https://github.com/saorgage/real-chat/releases).
2. Put them in `<your vault>/.obsidian/plugins/real-chat/`.
3. Reload Obsidian, then enable **Real Chat** under Settings → Community plugins.

## Setup

1. Open Settings → **Real Chat**.
2. Choose a **provider**: DeepSeek direct (cheapest) or OpenRouter (one key, many models).
3. Paste your API key. On OpenRouter, click **Load / refresh models**.
4. Open the sidebar from the ribbon (speech-bubble icon) or the "Open Real Chat" command.

## Privacy & network use

Real Chat only makes network requests you configure or trigger:

- **Your messages, and any note content you add as context**, are sent to the **API provider
  you choose** (DeepSeek, OpenRouter, or your own endpoint) to generate replies. Choose a
  provider you trust; review their data policy.
- **Web access** (off unless enabled) makes requests to your chosen search provider and to URLs
  you/the model fetch or download from.
- **OpenRouter model list and pricing** are fetched from OpenRouter when you use that provider.

There is no telemetry and no other data collection. Your API keys are stored in this plugin's
local `data.json` and are never sent anywhere except the provider they belong to. The plugin
does not download or execute any remote code.

## License

[MIT](LICENSE) © Chris Gage
