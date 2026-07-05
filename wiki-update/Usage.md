# Usage

## Sessions & history

Five chats (1–5), each with its own history, draft, model, pins and YOLO setting. Tabs auto-title from your first message. Histories survive restarts. The **⋮ menu** archives a session, opens history (reload any past chat), exports a chat to a note, or regenerates the last reply with a chosen model.

**New in 1.1.2+**: The confirmation dialog for file changes now requires an explicit click on **Apply changes** or **Cancel** — misclicks outside the dialog no longer silently cancel your edits.

## Context — what the model sees

- **Ref note** — feeds the currently open note into the conversation. Toggle with the 📄 button or `/ref` command.
- **Pin** — keeps chosen notes in context for the whole session (📎 chips). Click the pin icon on any note in chat, or use `/pin` command.
- **@ note / Selection / Attach** — add one-off context. You can also drag-drop text files in.
- The bottom bar shows **ctx ~Xk**: the estimated tokens in your *next* message (system + memory + ref + pins + history). Click it for a breakdown. If it's heavy, trim the memory file, untick Ref note, unpin notes, or clear/archive the session.

## Searching the vault

Two ways, both ranked (title, heading and tag matches count for more than body text; notes matching all your words and exact phrases rank highest):

- **Search box** — the 🔍 button in the chat toolbar, or the **Search vault (ranked)** command (give it a hotkey for an Omnisearch-style popup). Instant results, no model call, no token cost. Arrow keys to move, Enter or click to open.
- **In chat** — just ask ("find my notes about X", or `/search`). Slower and uses a few tokens, but the model can run several synonym searches and reason over the results — better for conceptual questions.

**Note**: Search snippets are now sanitised to prevent character corruption issues (v1.1.1+).

## Slash commands

Type `/` at the start of a line for a quick menu. Available commands:
- `/summarise` — Summarise the current note or selection
- `/search` — Search the vault
- `/rewrite` — Rewrite the current note or selection
- `/ref` — Toggle ref note
- `/pin` — Pin a note to context
- `/clear` — Clear the current session
- `/model` — Change the model for this session
- `/yolo` — Toggle YOLO mode
- `/help` — Show help

You can also build a **saved prompt library** and insert prompts from it using `/prompt`.

## Replies

- Clickable wikilinks that open in Obsidian
- **Copy / Insert / New note / Retry** buttons on each reply
- Code blocks with Copy buttons
- Long replies collapse automatically (click to expand)
- Any note/file the assistant creates or changes is listed with a clickable link under the reply
- Replies that ask you to confirm or decide get a highlighted left border
- Per-reply and lifetime cost are shown
- A ⏱️ timer shows think time for reasoning models

## Inline edit (no chat round-trip)

Select text in any note, run **Edit selection with Real Chat** (command palette / hotkey), say how to change it, and it rewrites in place. No context switching, no chat history bloat.

## YOLO mode

The header badge toggles YOLO for the current session (overrides the global default in Settings). When **ON**, all file changes apply with **no confirmation** — Obsidian's file history/trash is still your safety net. "Safe" shows when it's off.

**Use with caution**: YOLO mode bypasses all confirmation dialogs. Only enable if you trust the model and have backups.

## Keys & voice

- **Enter** sends, **Shift+Enter** newline, **Esc** stops generation
- For voice input: click the input box and press **Win+H** (Windows dictation) or use your OS's voice typing
- **Ctrl/Cmd+↑/↓** to navigate through message history in the input

## Jump to latest

In a long chat, a round **↑** button appears at the bottom-right when you scroll up — tap it to jump back to the newest message (works on mobile). While you're scrolled up reading, streaming replies no longer yank you to the bottom.

## Reasoning models

With a reasoning model (DeepSeek reasoner, or an OpenRouter thinking model like Claude 3 Sonnet/Haiku with reasoning enabled), the chain-of-thought streams into a collapsible **"Thinking"** block above the answer, then collapses once the reply lands. It's display-only and is not sent back to the model on later turns.

## Long tasks

There's a **50-step tool-loop cap** per turn to prevent runaway operations. If a task hits it, the reply pauses with a **Continue** button — press it to let the model carry on from where it stopped, rather than starting over.

## Character sanitisation (v1.1.1+)

All outgoing messages are automatically sanitised to remove:
- Lone UTF-16 surrogates (incomplete emoji characters)
- C0/C1 control characters (except \t, \n, \r)
- Unicode noncharacters (U+FDD0–U+FDEF, U+FFFE–U+FFFF)

This prevents "400 — Invalid character" errors from corrupted clipboard data or damaged note content.
