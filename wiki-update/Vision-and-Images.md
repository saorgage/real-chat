# Vision & Images

Real Chat can work with images two ways: **process them locally** (no model needed) and **have a model see them**.

## Attaching an image
Paste (Ctrl/Cmd+V), drag-drop, or use the **Image** button in the chat input. A chip appears, and a notice confirms which model will read it.

Attached images are **sticky**: the chip stays so follow-up questions about the same picture keep reaching the vision model. Tap **×** on the chip to remove it and return to normal text chat.

## How the model sees an image
- If your active model is **natively multimodal** (most big OpenRouter models, marked with an image icon in the model list), the image goes straight to it.
- If your model is **text-only** (e.g. DeepSeek), configure a separate **Vision provider** in Settings (off by default): paste a base URL, key and model — for example the **Gemini free tier**, or an OpenRouter vision model. While an image is attached, every turn is answered by the vision model and labelled **"Vision"**.

## See *and* act in one turn
The vision model runs the **full tool loop** — it doesn't just describe an image, it can act on it in the same message. For example:

> *"Save this screenshot to Attachments and tell me what the text says."*

…will **save the real picture** into your vault (via `save_attached_image`, returning a clickable `![[link]]`) **and** read the text back. It can also create/edit notes, search your vault, and use any other tool based on what it sees.

### `save_attached_image`
Writes the **actual pasted/attached image bytes** into your vault (not a description). Optional `path` (defaults to a name in your download folder; the extension is inferred from the image type) and `index` (which attached image, if several). Only offered to the model when an image is actually attached.

## Local image processing (no model)
Independent of vision, the model can call local image tools:
- `process_image` — compress to a target KB, resize, convert format (JPEG/PNG/WebP), crop, rotate, flip.
- `batch_process_images` — apply the same processing to a whole folder.
- `image_info` — report dimensions and size.

Ask things like "compress this image under 200 KB" or "convert the PNGs in Attachments to WebP".

## Notes
- Vision-provider cost is **not** tracked against DeepSeek/OpenRouter pricing (token counts are shown when the provider returns them).
- Pasted images live in memory for the session and aren't persisted to disk unless you (or the model) save them.