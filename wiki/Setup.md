# Setup

## Install

### From the Community Plugins store
Once accepted: **Settings → Community plugins → Browse → search "Real Chat" → Install → Enable.**

### Manual install
1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](https://github.com/saorgage/real-chat/releases).
2. Put them in `<your vault>/.obsidian/plugins/real-chat/`.
3. Reload Obsidian, then enable **Real Chat** under Settings → Community plugins.

## First-run setup

1. Open **Settings → Real Chat**.
2. Choose a **provider**:
   - **DeepSeek direct** — cheapest, cache-aware pricing.
   - **OpenRouter** — one key, 300+ models (Claude, GPT, Gemini, …) with a live model list and per-model pricing.
   - **Custom** — any OpenAI-compatible base URL.
3. Paste your **API key** for the chosen provider. On OpenRouter, click **Load / refresh models** to pull the list, then star your favourites.
4. Open the sidebar from the ribbon (speech-bubble icon) or run the **Open Real Chat** command.

## Picking a model

- Each session has its own model — set it from the model selector in the chat header.
- On OpenRouter, the list shows per-model pricing and marks **multimodal (vision-capable)** models, which can read images directly. For text-only models like DeepSeek, configure a separate **Vision provider** — see **[Vision & Images](Vision-and-Images)**.

## Where settings live

Your keys and live settings are stored in this plugin's local `data.json` inside the plugin folder. They are never sent anywhere except the provider they belong to. Don't commit `data.json` to a public repo.