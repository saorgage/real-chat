# Vision and Images

Real Chat supports images in two ways: **local image processing** (any model) and **vision model understanding** (vision-capable models or via a vision provider).

## Attaching images

- **Paste** from clipboard (Ctrl/Cmd+V)
- **Drag and drop** image files into the chat input
- **Attach** via the paperclip (📎) button

Supported formats: PNG, JPEG, WebP, GIF (static frames only), SVG, and most common image types.

## Local image processing (any model)

Even with a text-only model, you can process images locally:
- **Compress** — reduce file size
- **Resize** — change dimensions
- **Convert** — change format (PNG → JPEG, etc.)
- **Crop** — select a region
- **Rotate** — 90°, 180°, 270°

Use natural language: "compress this image to 50% quality", "resize to 800px wide", "crop to a square".

## Vision model understanding

### Option A: Use a vision-capable model directly

Set your session model to a vision-capable model (Claude 3, GPT-4o, Gemini 2.5, etc.) and it will see attached images directly.

### Option B: Use a vision provider (for text-only models)

**New in 1.1.0**: When your chat model can't see images (e.g., DeepSeek), the turn routes through your configured vision provider with the **complete tool set**.

This means the vision model can:
- See the image
- **And** use all tools (create notes, edit files, search, etc.)
- All in a single turn

Example: "Save this screenshot to my vault and tell me what it says" will:
1. Route to the vision provider
2. Save the actual image bytes to your vault via `save_attached_image`
3. OCR the text
4. Return both the saved file link and the extracted text

## Sticky images (v1.1.0+)

Attached images are now **sticky** — the image chip persists across follow-up turns. This means:
- Every follow-up message keeps the image in context
- The vision model continues to see it
- No need to re-attach on every message
- Tap the **×** button on the image chip to remove it

## save_attached_image tool (v1.1.0+)

A new tool that writes the *actual* pasted/attached image bytes into your vault:
- Decodes the in-memory data URL → `createBinary`
- Infers the extension from the MIME type
- Defaults to saving in your download folder
- Returns a clickable `![[path]]` wikilink
- Only offered to the model when an image is actually attached

Example workflow:
1. Paste a screenshot
2. Ask: "Save this to my screenshots folder and describe what's in it"
3. The vision model saves the image and describes it in one turn

## Vision provider configuration

To use a separate vision provider:

1. Go to **Settings → Real Chat → Vision**
2. Enable **Use vision provider**
3. Select provider (OpenRouter recommended)
4. Paste API key
5. Select a vision-capable model

The vision provider is only used when:
- An image is attached
- The current chat model cannot see images

## Image size limits

- Local processing: Limited by your system memory
- Vision API: Depends on your provider's limits (typically 10-20MB)
- Larger images may need compression before sending to vision APIs

## Privacy

- Images you attach are sent to your configured vision provider
- They are **not** stored by Real Chat beyond the current session
- Local processing happens entirely on your device
- No images are sent to any third party except your chosen providers
