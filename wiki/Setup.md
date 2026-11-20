# Setup

## Install

### From the Community Plugins store
Once accepted: **Settings → Community plugins → Browse → search "Real Chat" → Install → Enable.**

### Manual install
1. Download `main.js`, `manifest.json` and `styles.css` from the latest [release](https://github.com/saorgage/real-chat/releases).
2. Put them in `<your vault>/.obsidian/plugins/real-chat/`.
3. Reload Obsidian, then enable **Real Chat** under Settings → Community plugins.

## First-run setup

Real Chat requires **Obsidian 1.11.4 or newer** for secure API key storage.

1. Open **Settings → Real Chat**.
2. Choose a **provider**:
   - **DeepSeek direct** — cheapest, cache-aware pricing.
   - **Mistral** — Mistral Large, Small, Pixtral (vision), and Codestral models.
   - **OpenRouter** — one key, 300+ models (Claude, GPT, Gemini, …) with a live model list and per-model pricing.
3. Select or add your **API key** in Obsidian SecretStorage. On OpenRouter, click **Load / refresh models** to pull the list, then star your favourites.
4. Open the sidebar from the ribbon (speech-bubble icon) or run the **Open Real Chat** command.
5. Add or select your keys separately on each device; SecretStorage is local and is not synced with vault files.

## Picking a model

- Each session has its own model — set it from the model selector in the chat header.
- On OpenRouter, the list shows per-model pricing and marks **multimodal (vision-capable)** models, which can read images directly.
- On Mistral, **Pixtral Large** is the vision-capable model. For text-only models (DeepSeek, Mistral Small/Large, Codestral), configure a separate **Vision provider** — see **[Vision & Images](Vision-and-Images)**.

## Where settings live

API keys are stored in Obsidian SecretStorage, outside the plugin's `data.json`; other plugin settings remain in `data.json`. Existing keys are migrated to SecretStorage automatically when Real Chat loads. Keys are sent only to their configured providers when used.
