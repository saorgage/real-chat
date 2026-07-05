# Tools and Vault Actions

Real Chat provides a comprehensive set of tools for working with your vault and the web. These are automatically available to the model based on context.

## Note operations

### Create and edit
- **create_note** — Create a new note with given content
- **edit_note** — Replace the entire content of a note
- **append_note** — Add content to the end of a note
- **prepend_note** — Add content to the beginning of a note
- **insert_in_note** — Insert content at a specific position

### Organize
- **rename_note** — Rename a note (updates all links automatically)
- **delete_note** — Delete a note (goes to Obsidian trash)
- **move_note** — Move a note to a different folder

### Find and replace
- **find_in_note** — Search within a specific note
- **replace_in_note** — Find and replace text in a note
- **find_and_replace** — Find and replace across multiple notes

## Frontmatter and metadata

- **get_frontmatter** — Read a note's frontmatter
- **set_frontmatter** — Update frontmatter fields
- **add_tag** — Add a tag to a note
- **remove_tag** — Remove a tag from a note
- **get_tags** — List all tags in a note

## Vault analysis

- **vault_stats** — Get statistics about your vault (note count, word count, etc.)
- **find_backlinks** — Find notes that link to a specific note
- **find_orphans** — Find notes with no incoming links
- **find_broken_links** — Find broken wikilinks in your vault
- **word_count** — Count words in a note or selection

## Date and time

- **get_date** — Get current date/time
- **date_math** — Calculate dates ("3 days ago", "next Monday", etc.)

## Web access (optional)

Enable in **Settings → Real Chat → Web Access**.

- **web_search** — Search the web using DuckDuckGo (no key needed), Brave, or Tavily
- **fetch_url** — Fetch the content of a web page
- **download_file** — Download a file from a URL into your vault

### Search providers
- **DuckDuckGo** — Free, no API key required
- **Brave Search** — Requires API key (get from [Brave](https://brave.com/search/api/))
- **Tavily** — Requires API key (get from [Tavily](https://tavily.com/))

## Image tools

- **save_attached_image** — Save an attached image to your vault (v1.1.0+)
- **process_image** — Compress, resize, convert, crop, or rotate an image

## File operations

- **list_files** — List files in a folder
- **read_file** — Read the content of any file (text files, CSV, JSON)
- **write_file** — Write content to a file

## CSV and JSON

- **read_csv** — Parse and query CSV files
- **read_json** — Parse and query JSON files

## Tool loop behavior

### 50-step cap
There's a **50-step tool-loop cap** per turn to prevent runaway operations. If a task hits this limit:
- The reply pauses
- A **Continue** button appears
- Click to let the model carry on from where it stopped

### Confirmation required
By default, file-changing operations (create, edit, delete, rename, move) require your confirmation:
- A dialog shows what will change
- You must click **Apply changes** or **Cancel**
- Fixed in v1.1.2: Dialog no longer dismisses on misclick

### YOLO mode
When YOLO mode is enabled for a session:
- All file changes apply **without confirmation**
- Obsidian's file history/trash is still available as a safety net
- Toggle per-session in the chat header, or globally in Settings

## Tool availability

Tools are offered to the model based on:
- **Context**: Image tools only appear when an image is attached
- **Settings**: Web access tools only appear when enabled
- **Model capabilities**: Vision tools route to vision provider when needed
- **Session state**: Tools that don't make sense in context are hidden

## Best practices

1. **Be specific** — "Edit the meeting notes from yesterday" is better than "edit that file"
2. **Use context** — @mention notes or use /ref to provide context
3. **Check confirmations** — Always review what the model plans to change
4. **Use YOLO carefully** — Only enable when you trust the model and have backups
5. **Start small** — Test with read-only operations before making changes
