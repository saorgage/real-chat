# Tools & Vault Actions

Real Chat works through tool calls. Most are on by default; web access and advanced tools are opt-in.

## Notes & files
- **Read / write** — read a note, create, edit (full rewrite), append.
- **`replace_in_note`** — targeted find/replace; safer than a full rewrite for big files.
- **`rename_note` / `delete_note`** — rename or move, or send a file to system trash.
- File changes prompt for **confirmation** by default. Turn on **[YOLO mode](Usage#yolo-mode)** to skip confirmations for a session.

## Frontmatter & metadata
- `get_frontmatter`, `set_frontmatter`, `add_tag` — edit YAML properties and tags without touching the note body.

## Vault insight
- `search_vault` — ranked keyword search (see **[Usage → Searching](Usage#searching-the-vault)**).
- `find_backlinks`, `find_orphans`, `find_broken_links` — link hygiene.
- `word_count`, `vault_stats` — counts and overview.
- `date_math` — reliable date calculations (the model is told to use this rather than guess).

## Web access (optional, off by default)
Enable in Settings. Then the model can:
- `web_search` — DuckDuckGo needs no key; add a **Brave** or **Tavily** key for better results.
- `web_fetch` — read a page's content.
- `download_file` — grab an image/file from a URL into your download folder; embed with `![[path]]`.

Web requests use Obsidian's `requestUrl`, so there are no CORS issues. See [Privacy & network use](https://github.com/saorgage/real-chat#privacy--network-use).

## Images
Local processing (`process_image`, `batch_process_images`, `image_info`) and vision (`save_attached_image`) are covered on **[Vision & Images](Vision-and-Images)**.

## Data files
`read_csv`, `read_json` — pull content out of attached data files.

## Advanced tools (opt-in)
Off by default (Settings → Advanced tools):
- `run_command` — lets the model trigger Obsidian commands by id. Enable only if you're comfortable with that.

## Long tasks
A turn is capped at **50 tool steps**. If a task hits the cap, the reply pauses with a **Continue** button so the model can resume rather than restart.