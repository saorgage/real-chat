# Planned Features

This page tracks features that are **planned or under consideration** for Real Chat. These are not yet implemented but may appear in future releases.

> **Note:** Features marked as "Gage Chat only" are available in the private [Gage Chat](https://github.com/saorgage/gage-chat) plugin but **cannot** be added to Real Chat due to Obsidian's community plugin guidelines (e.g., arbitrary code execution).

---

## 🎯 High Priority

Features that are **likely to be added soon** and are **compliant with Obsidian's guidelines**.

| Feature | Description | Status | Notes |
|---------|-------------|--------|-------|
| **Mistral provider** | Add support for Mistral API (Large, Small, Pixtral, Codestral models) | ✅ **Implemented in v1.2.0** | Uses official Mistral API |
| **Save attached files** | Save dropped PDF/Word/Excel files to vault (not just images) | ⏳ Planned | Extracts text + saves raw bytes |
| **Improved error messages** | User-friendly messages for API errors (401, 402, 429, 5xx) | ⏳ Planned | Better UX for common issues |
| **Keyboard shortcuts** | Add `Ctrl+↑` (edit last), `Ctrl+K` (clear session), etc. | ⏳ Planned | Standard Obsidian pattern |
| **"New Chat" button** | Quick button to start a fresh session | ⏳ Planned | UI convenience |

---

## 📋 Medium Priority

| Feature | Description | Status | Notes |
|---------|-------------|--------|-------|
| **Context trimming settings** | Let users configure `collapseThreshold` | ⏳ Planned | User configurable |
| **"Copy as Markdown" button** | Copy formatted content with Markdown syntax | ⏳ Planned | For code blocks, tables |
| **"Search in Chat" modal** | Find text within the current chat session | ⏳ Planned | Like Ctrl+F for chats |
| **Message editing** | Edit sent messages | ⏳ Planned | Useful for fixing typos |
| **"Export All Sessions"** | Export all 5 sessions to a single note | ⏳ Planned | Batch export |
| **"Star" favorite messages** | Mark important responses for later reference | ⏳ Planned | Visual bookmarking |
| **"Summarize This Chat"** | One-click chat summary | ⏳ Planned | Uses /summarise internally |

---

## 🔧 Technical Improvements

| Feature | Description | Status | Notes |
|---------|-------------|--------|-------|
| **Reduce code duplication** | Extract shared utilities (modals, sanitizeText, etc.) | ⏳ Planned | Code maintenance |
| **Add TypeScript support** | Gradually migrate to TypeScript | ⏳ Planned | Better type safety |
| **Add unit tests** | Test critical functions (sanitizeText, searchVaultRanked, etc.) | ⏳ Planned | Uses Vitest/Jest |
| **Improve token counting** | More accurate estimation for Unicode/code | ⏳ Planned | Better context management |
| **Rate limiting** | Prevent API spam | ⏳ Planned | UX improvement |
| **"Low Token Mode"** | Token budget per session | ⏳ Planned | For users on limited budgets |
| **"Dry Run" mode** | Preview tool calls without executing | ⏳ Planned | Safe testing |

---

## 🚫 Gage Chat Only (Not for Real Chat)

These features **violate Obsidian's community plugin guidelines** and will **not** be added to Real Chat. They remain in [Gage Chat](https://github.com/saorgage/gage-chat) for private use.

| Feature | Reason | Risk |
|---------|--------|------|
| **`shell_exec`** | Arbitrary terminal command execution | ❌ **Banned** | Security risk |
| **Unrestricted `run_command`** | Could trigger unsafe Obsidian commands | ⚠️ **Review needed** | Depends on scope |
| **Direct `fs`/`child_process`** | Bypasses Obsidian's sandbox | ❌ **Banned** | Security risk |
| **Auto-downloading executables** | Security risk | ❌ **Banned** | Malware potential |

---

## 💡 Feature Requests

Have a feature idea? 
- **For Real Chat**: Open a [GitHub issue](https://github.com/saorgage/real-chat/issues) or [discussion](https://github.com/saorgage/real-chat/discussions).
- **For Gage Chat**: Check the [Gage Chat repo](https://github.com/saorgage/gage-chat).

---

## 📅 Changelog

For **released** features, see:
- [Releases](https://github.com/saorgage/real-chat/releases)
- [CHANGELOG.md](https://github.com/saorgage/real-chat/blob/main/CHANGELOG.md)
