# Usage

## Sessions & history
Five chats (1–5), each with its own history, draft, model, pins and YOLO setting. Tabs auto-title from your first message. Histories survive restarts. The **⋯ menu** archives a session, opens history (reload any past chat), exports a chat to a note, or regenerates the last reply with a chosen model.

## Context — what the model sees
- **Ref note** — feeds the currently open note into the conversation.
- **Pin** — keeps chosen notes in context for the whole session (📁 chips).
- **@ note / Selection / Attach** — add one-off context. You can also drag-drop text files in.
- The bottom bar shows **ctx ~Xk**: the estimated tokens in your *next* message (system + memory + ref + pins + history). Click it for a breakdown. If it's heavy, trim the memory file, untick Ref note, unpin notes, or clear/archive the session.

## Searching the vault
Two ways, both ranked (title, heading and tag matches count for more than body text; notes matching all your words and exact phrases rank highest):
- **Search box** — the 🔍 button in the chat toolbar, or the **Search vault (ranked)** command (give it a hotkey for an Omnisearch-style popup). Instant results, no model call, no token cost. Arrow keys to move, Enter or click to open.
- **In chat** — just ask ("find my notes about X", or `/search`). Slower and uses a few tokens, but the model can run several synonym searches and reason over the results — better for conceptual questions.

## Slash commands
Type `/` at the start of a line for a quick menu (`/summarise`, `/search`, `/rewrite`, …). You can also build a **saved prompt library** and insert prompts from it.

## Replies
Clickable wikilinks, **Copy / Insert / New note / Retry**, code blocks with Copy buttons, long replies collapse. Any note/file the assistant creates or changes is listed with a clickable link under the reply. Replies that ask you to confirm or decide get a highlighted left border. Per-reply and lifetime cost are shown, and a ⏱ timer shows think time.

## Inline edit (no chat round-trip)
Select text in any note, run **Edit selection with Real Chat** (command palette / hotkey), say how to change it, and it rewrites in place.

## YOLO mode
The header badge toggles YOLO for the current session (overrides the global default in Settings). When **ON**, all file changes apply with **no confirmation** — Obsidian's file history/trash is still your safety net. "Safe" shows when it's off.

## Keys & voice
**Enter** sends, **Shift+Enter** newline, **Esc** stops. For voice, click the input and press **Win+H** (Windows dictation).

## Jump to latest
In a long chat, a round **↑** button appears at the bottom-right when you scroll up — tap it to jump back to the newest message (works on mobile). While you're scrolled up reading, streaming replies no longer yank you to the bottom.

## Reasoning models
With a reasoning model (DeepSeek reasoner, or an OpenRouter thinking model), the chain-of-thought streams into a collapsible **"Thinking"** block above the answer, then collapses once the reply lands. It's display-only and is not sent back to the model on later turns.

## Long tasks
There's a **50-step tool-loop cap** per turn. If a task hits it, the reply pauses with a **Continue** button — press it to let the model carry on from where it stopped, rather than starting over.