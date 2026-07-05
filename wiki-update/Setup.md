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
   - **DeepSeek direct** — cheapest, cache-aware pricing. No middleman, just your key to DeepSeek's API.
   - **OpenRouter** — one key, 300+ models (Claude, GPT, Gemini, …) with a live model list and per-model pricing. Click **Load / refresh models** to pull the latest list, then star your favourites.
   - **Custom** — any OpenAI-compatible base URL. Enter your endpoint (e.g., `https://api.openai.com/v1` for OpenAI, or your self-hosted instance).
3. Paste your **API key** for the chosen provider.
4. Open the sidebar from the ribbon (speech-bubble icon) or run the **Open Real Chat** command.

## Picking a model

- Each session has its own model — set it from the model selector in the chat header.
- On OpenRouter, the list shows per-model pricing and marks **multimodal (vision-capable)** models with a 🖼️ icon, which can read images directly.
- For text-only models like DeepSeek, configure a separate **Vision provider** under Settings → Real Chat → Vision. See **[Vision & Images](Vision-and-Images)** for details.

## Vision provider setup (for text-only models)

If your primary model can't see images (e.g., DeepSeek Chat), you can configure a separate vision-capable model:

1. Go to **Settings → Real Chat → Vision**
2. Enable **Use vision provider**
3. Select a provider (OpenRouter recommended for access to Gemini, Claude 3, GPT-4o, etc.)
4. Paste the API key for that provider
5. Select a vision-capable model from the dropdown

Now when you attach an image, the vision model will process it with full tool access.

## Where settings live

Your keys and live settings are stored in this plugin's local `data.json` inside the plugin folder (`<vault>/.obsidian/plugins/real-chat/data.json`). They are never sent anywhere except the provider they belong to. **Do not commit `data.json` to a public repo.**

## Troubleshooting

### "400 — Invalid character" errors
These are now prevented by expanded character sanitisation (v1.1.1+). If you still see them, please report the exact message and context in a GitHub issue.

### Confirmation dialog closes unexpectedly
Fixed in v1.1.2. Update to the latest version if you experience this.

### Images don't work with my model
Your model may not support vision. Either:
- Switch to a vision-capable model (Claude 3, GPT-4o, Gemini 2.5, etc.)
- Configure a separate **Vision provider** as described above
