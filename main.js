'use strict';

const { Plugin, ItemView, PluginSettingTab, Setting, Notice, MarkdownRenderer, TFile, Modal, MarkdownView, requestUrl, Platform, setIcon } = require('obsidian');

const IS_MOBILE = Platform.isMobile;

const VIEW_TYPE_GAGE_CHAT = 'real-chat-view';
const SESSION_COUNT = 5;
const MAX_TOOL_STEPS = 50;
const TEXT_EXTS = ['md', 'txt', 'csv', 'json', 'js', 'ts', 'py', 'html', 'css', 'xml', 'yaml', 'yml', 'log', 'tsv', 'sql', 'sh'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const IMAGE_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
const COLLAPSE_CHARS = 1200;

const DEFAULT_SETTINGS = {
  provider: 'deepseek',
  apiKey: '', baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro',
  orKey: '', orModel: 'deepseek/deepseek-chat', orModels: [], orModelsFetched: 0,
  orFavourites: [], orRecents: [],
  systemPrompt:
    "You are a helpful assistant working inside the user's Obsidian vault.\n" +
    "Be clear and direct. No filler, no preamble, no restating the request, no needless summary at the end. Get to the point.\n" +
    "If something is a bad idea, say so plainly.\n\n" +
    "You can edit and create notes in the vault using the tools provided. When the user asks you to change or create " +
    "a note, call the appropriate tool rather than just printing the content. When you reference a note, write its path " +
    "as a wikilink like [[Folder/Note]] so the user can click it. ALWAYS give a clickable [[link]] to any note or file you create, edit, or download, every time, without being asked.\n" +
    "When you need the user to confirm, approve, or decide something, put that question on its own final line, phrased plainly (e.g. 'Shall I save this?'), so it stands out.\n" +
    "When the user asks you to remember something, call the remember tool.\n\n" +
    "You also have web_search, web_fetch and download_file tools when web access is enabled: use them whenever the user asks about " +
    "current events, anything online, to read a URL, or to grab an image/file (which you can save then embed with ![[path]]). " +
    "You can also delete_note, rename_note and replace_in_note for vault housekeeping. " +
    "You have image tools: process_image (compress to a target KB, resize, convert format, crop, rotate, flip), batch_process_images (whole folder), and image_info. " +
    "When the user asks to shrink, compress, resize or convert an image, call process_image. For 'reduce to under N KB' use the targetKB option. " +
    "When the user has pasted or attached an image in their message and wants it kept, filed, or embedded in a note, call save_attached_image to write the real picture into the vault (then reference it with ![[path]]). The image you can see IS the attached one. " +
    "You have data tools: read_csv and read_json to pull content out of attached files. " +
    "You have vault tools: search_vault (ranked keyword search), get_frontmatter, set_frontmatter, add_tag (edit YAML without touching the body), find_backlinks, find_orphans, find_broken_links, word_count, vault_stats, date_math (use date_math for any date calculation rather than guessing). " +
    "For a conceptual 'find notes about X' request, run search_vault several times with synonyms and combine the results. " +
    "Always give a clickable [[link]] to any image or note you create. " +
    "Do not claim you lack web access or the ability to download images if these tools are present.\n\n" +
    "IMPORTANT: persistent memory below may contain a 'Triggers' section: user-defined commands. When the user's " +
    "message invokes one, follow its instructions exactly using the vault tools.",
  memoryPath: '_memory/real-chat.md', helpFolder: '_memory', memoryEnabled: true,
  smallEditThreshold: 400, temperature: 0.6,
  priceProIn: 0.435, priceProOut: 0.87, priceProCache: 0.003625, priceFlashIn: 0.14, priceFlashOut: 0.28, priceFlashCache: 0.0028,
  totalInTokens: 0, totalOutTokens: 0, totalCost: 0,
  lastHelpVersion: '', persisted: null, archive: [], yolo: false,
  visionEnabled: false, visionBaseUrl: '', visionKey: '', visionModel: '',
  webEnabled: true, webMaxChars: 6000, searchProvider: 'duckduckgo', braveKey: '', tavilyKey: '',
  downloadFolder: 'Attachments', allowRunCommand: false,
  prompts: [
    { name: 'Summarise concisely', text: 'Summarise the above concisely: clear, direct, no filler.' },
    { name: 'Turn into a message', text: 'Rewrite the above as a short, clear message to a colleague.' }
  ]
};

const SLASH_COMMANDS = [
  { name: '/summarise', insert: 'Summarise the above concisely: clear, direct, no filler.' },
  { name: '/search', insert: 'Search my vault for: ' },
  { name: '/newnote', insert: 'Create a new note at <path> with this content: ' },
  { name: '/rewrite', insert: 'Rewrite the following to be clearer and tighter: ' },
  { name: '/expand', insert: 'Expand the following with more detail: ' }
];

const MEMORY_TEMPLATE =
  '# Real Chat memory\n\nRead automatically at the start of every Real Chat message. Persistent memory.\n' +
  'Edit by hand, or say "remember this" to append below.\n\n## Standing facts\n\n- \n\n' +
  '## Triggers\n\nUser-defined commands. Name + what to do. Invoke by typing the name.\n\n' +
  '- **add book**: when I say "add book <title>", append "- <title>" to "Reading/Reading list.md"\n' +
  '  (create it if missing). Confirm what you added.\n\n## Remembered notes\n';

const TOOLS = [
  { type: 'function', function: { name: 'create_note', description: 'Create a new note. Fails if path exists.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
  { type: 'function', function: { name: 'edit_note', description: 'Overwrite an existing note entirely.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
  { type: 'function', function: { name: 'append_note', description: 'Append text to a note (creates if missing). Best for lists/logs.', parameters: { type: 'object', properties: { path: { type: 'string' }, text: { type: 'string' } }, required: ['path', 'text'] } } },
  { type: 'function', function: { name: 'read_note', description: 'Read a note in full.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'list_notes', description: 'List note paths, optionally filtered by folder prefix.', parameters: { type: 'object', properties: { folder: { type: 'string' } }, required: [] } } },
  { type: 'function', function: { name: 'search_vault', description: 'Ranked keyword search across the vault. Matches title, headings, tags and body, and returns the most relevant notes first (notes containing all the words, and exact phrases, rank highest). Multiple words are each matched separately. IMPORTANT: it matches WORDS, not meaning — so for a conceptual or "find notes about X" request, call it several times with different synonyms and related terms (e.g. for "delivery risk" also try "slippage", "delay", "blocker"), then combine and de-duplicate the results before answering.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'One or more keywords, or a phrase.' }, folder: { type: 'string', description: 'Optional folder path prefix to restrict the search.' }, limit: { type: 'number', description: 'Max results to return (default 15, max 50).' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'remember', description: 'Append a fact to persistent memory.', parameters: { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] } } },
  { type: 'function', function: { name: 'web_search', description: 'Search the web for current information. Returns a list of results with titles, URLs and snippets.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'web_fetch', description: 'Fetch a web page by URL and return its readable text content. Use after web_search to read a result in full.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'download_file', description: 'Download a file (image, PDF, etc.) from a URL and save it into the vault. Returns the saved path, which you can embed with ![[path]].', parameters: { type: 'object', properties: { url: { type: 'string' }, path: { type: 'string', description: 'Optional target path in the vault, e.g. Attachments/cover.jpg. If omitted, a name is derived from the URL.' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'save_attached_image', description: 'Save the actual image the user pasted/attached in THIS message to a file in the vault (the real picture bytes, not a description). Use whenever the user wants to keep, file, or embed a pasted screenshot/photo. Returns the saved path; embed it with ![[path]].', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Target path in the vault, e.g. Attachments/screenshot.png. If omitted, a default name in the download folder is used. Extension is added from the image type if missing.' }, index: { type: 'number', description: '0-based index of which attached image to save when several are attached; default 0.' } }, required: [] } } },
  { type: 'function', function: { name: 'delete_note', description: 'Delete a note or file from the vault (moves to system trash).', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'rename_note', description: 'Rename or move a note/file to a new path.', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } } },
  { type: 'function', function: { name: 'replace_in_note', description: 'Find and replace a string in a note. Safer than edit_note for big files. Replaces the first occurrence unless all=true.', parameters: { type: 'object', properties: { path: { type: 'string' }, find: { type: 'string' }, replace: { type: 'string' }, all: { type: 'boolean' } }, required: ['path', 'find', 'replace'] } } },
  { type: 'function', function: { name: 'run_command', description: 'Run an Obsidian command by its id (e.g. editor:toggle-bold). Only works if enabled in settings.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },

  { type: 'function', function: { name: 'process_image', description: 'Process an image in the vault: compress to a target file size, resize, convert format, crop, rotate, or flip. All local, offline. Saves a new file and returns its path. Use this to reduce image KB, change dimensions, or convert PNG/JPEG/WebP.', parameters: { type: 'object', properties: {
    path: { type: 'string', description: 'Vault path of the source image.' },
    out: { type: 'string', description: 'Optional output path. If omitted, derived from source plus a suffix.' },
    targetKB: { type: 'number', description: 'Compress to approximately this size in KB by adjusting quality (JPEG/WebP).' },
    maxWidth: { type: 'number', description: 'Resize so width does not exceed this (keeps aspect ratio).' },
    maxHeight: { type: 'number', description: 'Resize so height does not exceed this (keeps aspect ratio).' },
    scale: { type: 'number', description: 'Scale factor, e.g. 0.5 for half size. Applied if maxWidth/maxHeight not given.' },
    format: { type: 'string', enum: ['jpeg', 'png', 'webp'], description: 'Output format. Default keeps source where sensible, else jpeg.' },
    quality: { type: 'number', description: 'Quality 1-100 for JPEG/WebP when not using targetKB. Default 82.' },
    rotate: { type: 'number', description: 'Rotate degrees clockwise: 90, 180, or 270.' },
    flip: { type: 'string', enum: ['horizontal', 'vertical'], description: 'Flip the image.' },
    crop: { type: 'object', description: 'Crop rectangle in pixels: {x, y, width, height}.' }
  }, required: ['path'] } } },
  { type: 'function', function: { name: 'image_info', description: 'Get an image\'s dimensions, format, and file size in KB.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'batch_process_images', description: 'Apply the same image processing (compress/resize/convert) to every image in a folder. Returns a summary. Same options as process_image, minus crop.', parameters: { type: 'object', properties: {
    folder: { type: 'string', description: 'Folder of images to process.' },
    targetKB: { type: 'number' }, maxWidth: { type: 'number' }, maxHeight: { type: 'number' }, scale: { type: 'number' },
    format: { type: 'string', enum: ['jpeg', 'png', 'webp'] }, quality: { type: 'number' },
    suffix: { type: 'string', description: 'Suffix added to output names, default "-opt".' }
  }, required: ['folder'] } } },
  { type: 'function', function: { name: 'list_files', description: 'List non-note files (images, PDFs, etc.) in the vault, optionally filtered by folder and/or extension.', parameters: { type: 'object', properties: { folder: { type: 'string' }, ext: { type: 'string', description: 'e.g. png, jpg, pdf' } }, required: [] } } },
  { type: 'function', function: { name: 'create_folder', description: 'Create a folder in the vault.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'move_file', description: 'Move or rename any file (same as rename but clearer for binaries).', parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } } },
  { type: 'function', function: { name: 'file_info', description: 'Get size (KB), created and modified times for any vault file.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'vault_stats', description: 'Summary of the vault: note count, file count, total size, largest files.', parameters: { type: 'object', properties: {} } } },

  { type: 'function', function: { name: 'read_csv', description: 'Read a CSV file from the vault and return it as a markdown table (or raw). No library needed.', parameters: { type: 'object', properties: { path: { type: 'string' }, asTable: { type: 'boolean', description: 'Render as a markdown table (default true).' }, maxRows: { type: 'number' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'read_json', description: 'Read and pretty-print a JSON file from the vault.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },

  { type: 'function', function: { name: 'get_frontmatter', description: 'Read the YAML frontmatter of a note as a JSON object.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'set_frontmatter', description: 'Set or update a frontmatter field on a note without touching the body. Use for tags, status, dates, etc.', parameters: { type: 'object', properties: { path: { type: 'string' }, key: { type: 'string' }, value: { type: 'string', description: 'Value. For a list field like tags, pass comma-separated and set asList=true.' }, asList: { type: 'boolean' } }, required: ['path', 'key', 'value'] } } },
  { type: 'function', function: { name: 'add_tag', description: 'Add a tag to a note\'s frontmatter tags list.', parameters: { type: 'object', properties: { path: { type: 'string' }, tag: { type: 'string' } }, required: ['path', 'tag'] } } },

  { type: 'function', function: { name: 'find_backlinks', description: 'Find all notes that link to the given note via [[wikilinks]].', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'find_orphans', description: 'List notes that have no incoming or outgoing wikilinks.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'find_broken_links', description: 'List wikilinks that point to notes which do not exist.', parameters: { type: 'object', properties: {} } } },

  { type: 'function', function: { name: 'word_count', description: 'Word, character, and reading-time count for a note.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'date_math', description: 'Reliable date calculations. Returns today, or a date offset by days/weeks/months, or the difference between two dates.', parameters: { type: 'object', properties: { op: { type: 'string', enum: ['today', 'offset', 'diff'], description: 'today, offset (from a base date), or diff (between two dates).' }, base: { type: 'string', description: 'Base date YYYY-MM-DD (for offset/diff).' }, to: { type: 'string', description: 'Second date YYYY-MM-DD (for diff).' }, days: { type: 'number' }, weeks: { type: 'number' }, months: { type: 'number' } }, required: ['op'] } } }
];

function makeSession() { return { messages: [], reference: false, draft: '', model: '', attachments: [], pinned: [], title: '', yolo: null, sessTok: 0, sessCost: 0 }; }
function nowStamp() { const d = new Date(); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function extOf(p) { const i = p.lastIndexOf('.'); return i < 0 ? '' : p.slice(i + 1).toLowerCase(); }
// Strip "lone" UTF-16 surrogates (one half of a surrogate pair with no partner). These appear when
// text is sliced mid-character (e.g. a search snippet cutting through an emoji) and otherwise make
// the provider reject the entire request with "lone leading surrogate in hex escape" (HTTP 400).
function stripLoneSurrogates(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')      // high surrogate not followed by a low → drop it
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1');  // low surrogate not preceded by a high → drop the low
}

class ConfirmModal extends Modal {
  constructor(app, title, body, onConfirm) { super(app); this.title = title; this.body = body; this.onConfirm = onConfirm; this.decided = false; }
  onOpen() {
    const { contentEl } = this; contentEl.createEl('h3', { text: this.title }); const pre = contentEl.createEl('pre', { cls: 'real-chat-confirm-preview' }); pre.setText(this.body.length > 1500 ? this.body.slice(0, 1500) + '\n\n…(truncated)' : this.body); const row = contentEl.createDiv({ cls: 'real-chat-confirm-row' }); row.createEl('button', { text: 'Cancel' }).onclick = () => { this.decided = true; this.close(); this.onConfirm(false); }; row.createEl('button', { text: 'Apply changes', cls: 'mod-cta' }).onclick = () => { this.decided = true; this.close(); this.onConfirm(true); };
    // A stray click on the dimmed backdrop must NOT silently cancel the change. Swallow clicks that land
    // outside the dialog box (capture-phase, so we run before Obsidian's own backdrop-close handler). Only
    // the explicit Cancel / Apply buttons — or the Escape key — decide.
    this._backdropGuard = (e) => { if (this.modalEl && !this.modalEl.contains(e.target)) { e.stopPropagation(); } };
    this.containerEl.addEventListener('click', this._backdropGuard, true);
  }
  onClose() { if (this._backdropGuard) { this.containerEl.removeEventListener('click', this._backdropGuard, true); this._backdropGuard = null; } this.contentEl.empty(); if (!this.decided) this.onConfirm(false); }
}

class InfoModal extends Modal {
  constructor(app, title, body) { super(app); this.title = title; this.body = body; }
  onOpen() { const { contentEl } = this; contentEl.createEl('h3', { text: this.title }); const pre = contentEl.createEl('pre', { cls: 'real-chat-confirm-preview' }); pre.setText(this.body); const row = contentEl.createDiv({ cls: 'real-chat-confirm-row' }); row.createEl('button', { text: 'Close', cls: 'mod-cta' }).onclick = () => this.close(); }
  onClose() { this.contentEl.empty(); }
}

class PickerModal extends Modal {
  constructor(app, title, items, onPick) { super(app); this.title = title; this.items = items; this.onPick = onPick; }
  onOpen() { const { contentEl } = this; contentEl.createEl('h3', { text: this.title }); const search = contentEl.createEl('input', { cls: 'real-chat-picker-search', attr: { placeholder: 'Filter…' } }); const list = contentEl.createDiv({ cls: 'real-chat-picker-list' }); const render = (filter) => { list.empty(); const f = (filter || '').toLowerCase(); for (const it of this.items) { if (f && !it.label.toLowerCase().includes(f)) continue; const row = list.createEl('button', { cls: 'real-chat-picker-item', text: it.label }); row.onclick = () => { this.close(); this.onPick(it.value); }; } }; search.addEventListener('input', () => render(search.value)); render(''); setTimeout(() => search.focus(), 50); }
  onClose() { this.contentEl.empty(); }
}

class InlineEditModal extends Modal {
  constructor(app, onSubmit) { super(app); this.onSubmit = onSubmit; }
  onOpen() { const { contentEl } = this; contentEl.createEl('h3', { text: 'Edit selection' }); const ta = contentEl.createEl('textarea', { cls: 'real-chat-inline-input', attr: { rows: 3, placeholder: 'How should I change the selected text?' } }); ta.style.width = '100%'; const row = contentEl.createDiv({ cls: 'real-chat-confirm-row' }); row.createEl('button', { text: 'Cancel' }).onclick = () => this.close(); row.createEl('button', { text: 'Apply', cls: 'mod-cta' }).onclick = () => { const v = ta.value.trim(); this.close(); if (v) this.onSubmit(v); }; setTimeout(() => ta.focus(), 50); }
  onClose() { this.contentEl.empty(); }
}

// Dedicated, instant, token-free ranked vault search (Omnisearch-style box).
class VaultSearchModal extends Modal {
  constructor(app, plugin, initialQuery) { super(app); this.plugin = plugin; this.initialQuery = initialQuery || ''; this.results = []; this.sel = 0; this._t = null; }
  onOpen() {
    const { contentEl, modalEl } = this; modalEl.addClass('real-chat-search-modal');
    contentEl.createEl('h3', { text: 'Search vault' });
    this.input = contentEl.createEl('input', { cls: 'real-chat-search-input', attr: { type: 'text', placeholder: 'Type to search… ranked by title, headings, tags and body' } });
    this.info = contentEl.createDiv({ cls: 'real-chat-search-info' });
    this.list = contentEl.createDiv({ cls: 'real-chat-search-list' });
    this.input.addEventListener('input', () => { if (this._t) window.clearTimeout(this._t); this._t = window.setTimeout(() => this.run(), 150); });
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    if (this.initialQuery) this.input.value = this.initialQuery;
    setTimeout(() => { this.input.focus(); if (this.initialQuery) this.run(); }, 50);
  }
  async run() {
    const q = this.input.value.trim();
    if (!q) { this.results = []; this.info.setText(''); this.list.empty(); return; }
    const all = await this.plugin.searchVaultRanked(q);
    this.results = all.slice(0, 50); this.sel = 0;
    this.info.setText(all.length ? (all.length + ' result' + (all.length === 1 ? '' : 's') + (all.length > this.results.length ? ' · showing first ' + this.results.length : '')) : 'No matches');
    this.render();
  }
  render() {
    this.list.empty();
    this.results.forEach((r, i) => {
      const row = this.list.createDiv({ cls: 'real-chat-search-row' + (i === this.sel ? ' is-sel' : '') });
      const top = row.createDiv({ cls: 'real-chat-search-rowtop' });
      top.createSpan({ cls: 'real-chat-search-rtitle', text: r.title });
      top.createSpan({ cls: 'real-chat-search-where', text: r.where });
      row.createDiv({ cls: 'real-chat-search-path', text: r.path });
      row.createDiv({ cls: 'real-chat-search-snip', text: '…' + r.snip + '…' });
      row.onclick = () => this.openResult(i);
      row.addEventListener('mouseenter', () => { this.sel = i; this.highlight(); });
    });
  }
  highlight() { const rows = this.list.children; for (let i = 0; i < rows.length; i++) rows[i].toggleClass('is-sel', i === this.sel); const cur = rows[this.sel]; if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' }); }
  onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (this.results.length) { this.sel = Math.min(this.sel + 1, this.results.length - 1); this.highlight(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (this.results.length) { this.sel = Math.max(this.sel - 1, 0); this.highlight(); } }
    else if (e.key === 'Enter') { e.preventDefault(); if (this.results.length) this.openResult(this.sel); }
  }
  openResult(i) { const r = this.results[i]; if (!r) return; this.close(); this.app.workspace.openLinkText(r.path, '', false); }
  onClose() { if (this._t) window.clearTimeout(this._t); this.contentEl.empty(); }
}

class GageChatView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.sessions = plugin.loadPersistedSessions() || (() => { const a = []; for (let i = 0; i < SESSION_COUNT; i++) a.push(makeSession()); return a; })(); this.active = 0; this.busy = {}; this.aborters = {}; this.timers = {}; }
  getViewType() { return VIEW_TYPE_GAGE_CHAT; }
  getDisplayText() { return 'Real Chat'; }
  getIcon() { return 'message-square'; }
  cur() { return this.sessions[this.active]; }
  isBusy(i) { return !!this.busy[i]; }
  sessionModel() { return this.cur().model || (this.plugin.settings.provider === 'openrouter' ? this.plugin.settings.orModel : this.plugin.settings.model); }

  assistantLabel(m) {
    if (m && m.via === 'vision') return 'Vision';
    const id = (m && m.model) || this.sessionModel() || '';
    if (id.includes('/')) {
      const known = (this.plugin.settings.orModels || []).find(x => x.id === id);
      if (known && known.name) return known.name.length > 22 ? known.name.slice(0, 22) + '\u2026' : known.name;
      const tail = id.split('/').pop();
      return tail.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 22);
    }
    if (id.includes('pro')) return 'DeepSeek V4 Pro';
    if (id.includes('flash')) return 'DeepSeek V4 Flash';
    if (id.includes('deepseek')) return 'DeepSeek';
    return this.plugin.settings.provider === 'openrouter' ? 'Assistant' : 'DeepSeek';
  }

  populateModelSelect() {    const sel = this.modelSelect; if (!sel) return;
    const prev = sel.value;
    sel.empty();
    sel.createEl('option', { text: 'Model: default', value: '' });
    if (this.plugin.settings.provider === 'openrouter') {
      const S = this.plugin.settings;
      const list = S.orModels || [];
      if (!list.length) { sel.createEl('option', { text: '(load models in settings)', value: '' }); sel.value = prev || ''; return; }
      const byId = {}; for (const m of list) byId[m.id] = m;
      const label = (m) => { const p = m.outPrice ? ' ($' + (m.outPrice * 1e6).toFixed(2) + '/M)' : ' (free)'; return (m.vision ? '\uD83D\uDDBC ' : '') + m.name + p; };
      const favs = (S.orFavourites || []).filter(id => byId[id]);
      const recents = (S.orRecents || []).filter(id => byId[id] && !favs.includes(id));
      if (favs.length) { const g = sel.createEl('optgroup'); g.label = '\u2605 Favourites'; for (const id of favs) g.createEl('option', { text: label(byId[id]), value: id }); }
      if (recents.length) { const g = sel.createEl('optgroup'); g.label = '\u21bb Recent'; for (const id of recents) g.createEl('option', { text: label(byId[id]), value: id }); }
      const ga = sel.createEl('optgroup'); ga.label = 'All models';
      for (const m of list) ga.createEl('option', { text: label(m), value: m.id });
    } else {
      sel.createEl('option', { text: 'V4 Pro', value: 'deepseek-v4-pro' });
      sel.createEl('option', { text: 'V4 Flash', value: 'deepseek-v4-flash' });
    }
    sel.value = prev || (this.cur() ? this.cur().model : '') || '';
  }
  sessionYolo() { const s = this.cur(); return s.yolo == null ? this.plugin.settings.yolo : s.yolo; }

  async onOpen() {
    const root = this.containerEl.children[1]; root.empty(); root.addClass('real-chat-root');
    const header = root.createDiv({ cls: 'real-chat-header' });
    header.createEl('span', { text: 'Real Chat', cls: 'real-chat-title' });
    this.memBadge = header.createEl('span', { cls: 'real-chat-mem' });
    this.memBadge.onclick = async () => { this.plugin.settings.memoryEnabled = !this.plugin.settings.memoryEnabled; await this.plugin.saveSettings(); this.refreshMemBadge(); };
    this.yoloBadge = header.createEl('span', { cls: 'real-chat-yolo' });
    this.yoloBadge.onclick = () => { const s = this.cur(); const eff = this.sessionYolo(); s.yolo = !eff; this.persist(); this.refreshYoloBadge(); new Notice('YOLO ' + (s.yolo ? 'ON' : 'off') + ' for session ' + (this.active + 1)); };
    const clearBtn = header.createEl('button', { cls: 'real-chat-btn real-chat-clearbtn' });
    setIcon(clearBtn, 'eraser');
    clearBtn.title = 'Clear this session';
    clearBtn.onclick = () => this.clearSession();
    const menuBtn = header.createEl('button', { text: '⋯', cls: 'real-chat-btn' });
    menuBtn.onclick = (e) => this.openMenu(e);

    const listWrap = root.createDiv({ cls: 'real-chat-listwrap' });
    this.listEl = listWrap.createDiv({ cls: 'real-chat-list' });
    this.scrollBtn = listWrap.createDiv({ cls: 'real-chat-scrollbtn', attr: { 'aria-label': 'Jump to latest' } });
    this.scrollBtn.createSpan({ text: '↓' });
    this.scrollBtn.onclick = () => this.scrollToBottom(true);
    this.listEl.addEventListener('scroll', () => this.updateScrollBtn());

    const ctxRow = root.createDiv({ cls: 'real-chat-ctxrow' });
    const ctxLabel = ctxRow.createEl('label', { cls: 'real-chat-ctx' });
    this.refCb = ctxLabel.createEl('input', { type: 'checkbox' });
    ctxLabel.createSpan({ text: ' Ref note' });
    this.refName = ctxLabel.createSpan({ cls: 'real-chat-refname' });
    this.refCb.onchange = () => { this.cur().reference = this.refCb.checked; this.persist(); this.refreshRefName(); this.refreshContextSize(); };
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refreshRefName()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.refreshRefName()));
    const tabs = ctxRow.createDiv({ cls: 'real-chat-tabs' });
    this.tabBtns = [];
    for (let i = 0; i < SESSION_COUNT; i++) { const b = tabs.createEl('button', { cls: 'real-chat-tab' }); b.onclick = () => this.switchSession(i); this.tabBtns.push(b); }

    this.chipRow = root.createDiv({ cls: 'real-chat-chiprow' });

    const toolbar = root.createDiv({ cls: 'real-chat-toolbar' });
    toolbar.createEl('button', { text: '🔍 Search', cls: 'real-chat-mini' }).onclick = () => new VaultSearchModal(this.app, this.plugin).open();
    toolbar.createEl('button', { text: '@ note', cls: 'real-chat-mini' }).onclick = () => this.pickRecentNote();
    toolbar.createEl('button', { text: 'Pin', cls: 'real-chat-mini' }).onclick = () => this.pinNote();
    toolbar.createEl('button', { text: 'Selection', cls: 'real-chat-mini' }).onclick = () => this.attachSelection();
    toolbar.createEl('button', { text: 'Attach', cls: 'real-chat-mini' }).onclick = () => this.pickAttachment();
    toolbar.createEl('button', { text: 'Import', cls: 'real-chat-mini' }).onclick = () => this.importExternalFile();
    toolbar.createEl('button', { text: 'Image', cls: 'real-chat-mini' }).onclick = () => this.pickImage();
    toolbar.createEl('button', { text: 'Prompts', cls: 'real-chat-mini' }).onclick = () => this.pickPrompt();

    const inputWrap = root.createDiv({ cls: 'real-chat-inputwrap' });
    this.inputEl = inputWrap.createEl('textarea', { cls: 'real-chat-input', attr: { rows: 5, placeholder: 'Ask anything. Enter sends, Shift+Enter newline, Esc stops. / for commands. Win+H to dictate.' } });
    this.inputEl.addEventListener('input', () => { this.cur().draft = this.inputEl.value; this.autoGrow(); this.maybeSlash(); });
    this.inputEl.addEventListener('dragover', (e) => e.preventDefault());
    this.inputEl.addEventListener('drop', (e) => this.onDrop(e));
    this.inputEl.addEventListener('paste', (e) => this.onPaste(e));
    const btnCol = inputWrap.createDiv({ cls: 'real-chat-btncol' });
    this.sendBtn = btnCol.createEl('button', { text: 'Send', cls: 'real-chat-send mod-cta' });
    this.sendBtn.onclick = () => { this.isBusy(this.active) ? this.stop(this.active) : this.handleSend(); };

    this.inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); } else if (e.key === 'Escape') { e.preventDefault(); this.stop(this.active); } });

    const bottom = root.createDiv({ cls: 'real-chat-bottom' });
    this.modelSelect = bottom.createEl('select', { cls: 'real-chat-modelsel dropdown' });
    this.populateModelSelect();
    this.modelSelect.onchange = () => { this.cur().model = this.modelSelect.value; this.persist(); };
    this.ctxEl = bottom.createEl('span', { cls: 'real-chat-ctxsize' });
    this.ctxEl.onclick = () => this.showContextBreakdown();
    this.timerEl = bottom.createEl('span', { cls: 'real-chat-timer' });
    this.costEl = bottom.createEl('span', { cls: 'real-chat-cost' });

    this.refreshMemBadge(); this.refreshYoloBadge(); this.syncToSession(); this.refreshCost();
    if (IS_MOBILE) this._addNavGrip(bottom);
  }

  autoGrow() { this.inputEl.style.height = 'auto'; this.inputEl.style.height = Math.min(Math.max(this.inputEl.scrollHeight, 96), 240) + 'px'; }
  scrollToBottom(smooth) { const el = this.listEl; if (!el) return; try { el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { el.scrollTop = el.scrollHeight; } }
  updateScrollBtn() { if (!this.scrollBtn || !this.listEl) return; const el = this.listEl; const off = el.scrollHeight - el.scrollTop - el.clientHeight; this.scrollBtn.toggleClass('is-visible', off > 120); }
  refreshMemBadge() { const on = this.plugin.settings.memoryEnabled; this.memBadge.setText(on ? 'Mem: on' : 'Mem: off'); this.memBadge.toggleClass('is-on', on); this.memBadge.toggleClass('is-off', !on); }
  refreshRefName() { if (!this.refName) return; const f = this.app.workspace.getActiveFile(); this.refName.setText(this.refCb.checked && f ? (': ' + f.basename) : ''); }
  refreshYoloBadge() { const on = this.sessionYolo(); this.yoloBadge.setText(on ? 'YOLO' : 'Safe'); this.yoloBadge.toggleClass('is-on', on); this.yoloBadge.toggleClass('is-off', !on); this.yoloBadge.title = 'YOLO applies all file changes without asking. Click to toggle for this session.'; }

  openMenu(e) {
    const items = [
      { label: 'New / clear this session', value: 'clear' },
      { label: 'Archive this session', value: 'archive' },
      { label: 'Open history…', value: 'history' },
      { label: 'Export session to note', value: 'export' },
      { label: 'Open memory file', value: 'memory' },
      { label: 'Regenerate last (choose model)…', value: 'regen' }
    ];
    new PickerModal(this.app, 'Menu', items, (v) => {
      if (v === 'clear') this.clearSession();
      else if (v === 'archive') this.archiveSession();
      else if (v === 'history') this.openHistory();
      else if (v === 'export') this.exportSession();
      else if (v === 'memory') this.plugin.openMemoryFile();
      else if (v === 'regen') this.regenChooseModel();
    }).open();
  }

  clearSession() {
    if (this.isBusy(this.active)) { new Notice('Stop the current reply first.'); return; }
    const c = this.cur(); c.messages = []; c.title = ''; c.sessTok = 0; c.sessCost = 0;
    this.persist(); this.renderMessages(); this.refreshTabs(); this.refreshCost(); this.refreshContextSize();
  }

  maybeSlash() {
    const v = this.inputEl.value;
    if (v === '/' || (v.endsWith('/') && (v.length === 1 || v[v.length - 2] === '\n' || v[v.length - 2] === ' '))) {
      new PickerModal(this.app, 'Slash commands', SLASH_COMMANDS.map(c => ({ label: c.name, value: c.insert })), (ins) => {
        this.inputEl.value = v.slice(0, -1) + ins; this.cur().draft = this.inputEl.value; this.autoGrow(); this.inputEl.focus();
      }).open();
    }
  }

  renderChips() {
    this.chipRow.empty();
    const s = this.cur(); const atts = s.attachments || []; const pins = s.pinned || [];
    if (!atts.length && !pins.length) { this.chipRow.toggleClass('is-empty', true); return; }
    this.chipRow.toggleClass('is-empty', false);
    pins.forEach((p, idx) => { const chip = this.chipRow.createDiv({ cls: 'real-chat-chip is-pin' }); chip.createSpan({ text: '📌 ' + p.label }); const x = chip.createSpan({ cls: 'real-chat-chipx', text: '×' }); x.onclick = () => { s.pinned.splice(idx, 1); this.persist(); this.renderChips(); }; });
    atts.forEach((a, idx) => { const chip = this.chipRow.createDiv({ cls: 'real-chat-chip' + (a.image ? ' is-image' : '') }); chip.createSpan({ text: (a.image ? '🖼 ' : '') + a.label }); const x = chip.createSpan({ cls: 'real-chat-chipx', text: '×' }); x.onclick = () => { s.attachments.splice(idx, 1); this.persist(); this.renderChips(); }; });
    this.refreshContextSize();
  }

  syncToSession() { const s = this.cur(); this.refCb.checked = s.reference; this.inputEl.value = s.draft || ''; this.modelSelect.value = s.model || ''; this.updateSendBtn(); this.refreshTabs(); this.refreshYoloBadge(); this.refreshRefName(); this.renderMessages(); this.renderChips(); this.autoGrow(); this.refreshContextSize(); }
  updateSendBtn() { const b = this.isBusy(this.active); this.sendBtn.setText(b ? 'Stop' : 'Send'); this.sendBtn.toggleClass('is-stop', b); }
  switchSession(i) { if (i === this.active) return; this.cur().draft = this.inputEl.value; this.active = i; this.syncToSession(); this.updateTimerDisplay(); this.refreshCost(); }
  tabLabel(i) { const s = this.sessions[i]; return s.title ? s.title.slice(0, 14) : String(i + 1); }
  refreshTabs() { for (let i = 0; i < this.tabBtns.length; i++) { this.tabBtns[i].setText(String(i + 1)); const ttl = this.sessions[i].title; this.tabBtns[i].title = ttl ? (ttl) : ('Session ' + (i + 1)); this.tabBtns[i].toggleClass('is-active', i === this.active); this.tabBtns[i].toggleClass('has-content', this.sessions[i].messages.length > 0); this.tabBtns[i].toggleClass('is-busy', this.isBusy(i)); } }
  refreshCost() { const cu = this.cur(); const tok = cu.sessTok || 0; const cost = cu.sessCost || 0; this.costEl.setText('session: ' + tok.toLocaleString() + ' tok \u00b7 $' + cost.toFixed(4)); this.costEl.title = 'This session. Lifetime total is in settings.'; }

  updateTimerDisplay() { if (this.isBusy(this.active) && this.timers[this.active]) { const secs = ((Date.now() - this.timers[this.active]) / 1000).toFixed(1); this.timerEl.setText('⏱ ' + secs + 's'); } else this.timerEl.setText(''); }

  wireLinks(container) {
    container.querySelectorAll('a.internal-link, a[data-href]').forEach((el) => { el.addEventListener('click', (e) => { e.preventDefault(); const target = el.getAttribute('data-href') || el.getAttribute('href') || el.textContent; this.app.workspace.openLinkText(target, '', false); }); });
    container.querySelectorAll('p, li').forEach((node) => { if (node.querySelector('a')) return; const txt = node.textContent; const m = txt && txt.match(/([\w \-\/]+\.md)\b/); if (m && this.app.vault.getAbstractFileByPath(m[1].trim())) { const path = m[1].trim(); const before = txt.slice(0, txt.indexOf(m[1])); const after = txt.slice(txt.indexOf(m[1]) + m[1].length); node.empty(); node.appendText(before); const a = node.createEl('a', { text: path, cls: 'real-chat-pathlink' }); a.onclick = (e) => { e.preventDefault(); this.app.workspace.openLinkText(path, '', false); }; node.appendText(after); } });
  }
  addCodeCopyButtons(container) {
    container.querySelectorAll('pre').forEach((pre) => { if (pre.querySelector('.real-chat-code-copy')) return; const btn = pre.createEl('button', { cls: 'real-chat-code-copy', text: 'Copy' }); btn.onclick = () => { const code = pre.querySelector('code'); navigator.clipboard.writeText(code ? code.textContent : pre.textContent); new Notice('Code copied'); }; });
  }

  isAskingConfirmation(text) {
    if (!text) return false;
    const tail = text.trim().slice(-200).toLowerCase();
    if (tail.includes('?')) return true;
    const cues = ['shall i', 'should i', 'do you want', 'would you like', 'let me know', 'confirm', 'proceed?', 'go ahead', 'want me to', 'ready to', 'finalise', 'finalize', 'sign off', 'approve'];
    return cues.some(c => tail.includes(c));
  }

  renderMessages() {
    const el = this.listEl;
    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 80;
    const prevTop = el.scrollTop;
    el.empty();
    const msgs = this.cur().messages;
    if (msgs.length === 0) { el.createDiv({ cls: 'real-chat-empty', text: 'Session ' + (this.active + 1) + '. What do you need?' }); this.updateScrollBtn(); return; }
    for (let idx = 0; idx < msgs.length; idx++) {
      const m = msgs[idx];
      if (m.role === 'system' || m.role === 'tool') continue;
      if (m.role === 'assistant' && !(m.content || '').trim() && !(m.tools && m.tools.length)) continue;
      const bubble = this.listEl.createDiv({ cls: 'real-chat-msg real-chat-' + m.role });
      const head = bubble.createDiv({ cls: 'real-chat-who' });
      head.createSpan({ text: m.role === 'user' ? 'You' : this.assistantLabel(m) });
      if (m.time) head.createSpan({ cls: 'real-chat-time', text: m.time });
      const long = (m.content || '').length > COLLAPSE_CHARS;
      const content = bubble.createDiv({ cls: 'real-chat-content' + (long && m.collapsed ? ' is-collapsed' : '') });
      if (m.role === 'assistant') {
        if (this.isAskingConfirmation(m.content || '')) bubble.addClass('real-chat-asks');
        if (m.reasoning && m.reasoning.trim()) { const det = content.createEl('details', { cls: 'real-chat-reasoning' }); det.open = !!m.streaming; det.createEl('summary', { text: m.streaming ? 'Thinking…' : 'Thinking' }); det.createEl('div', { cls: 'real-chat-reasoning-body', text: m.reasoning }); }
        MarkdownRenderer.render(this.app, m.content || '', content, '', this.plugin);
        this.wireLinks(content); this.addCodeCopyButtons(content);
        if (m.files && m.files.length) {
          const fr = bubble.createDiv({ cls: 'real-chat-files' });
          fr.createSpan({ cls: 'real-chat-fileslabel', text: 'Created / changed: ' });
          m.files.forEach((p, i) => { if (i) fr.appendText(' · '); const a = fr.createEl('a', { cls: 'real-chat-filelink', text: p.split('/').pop() }); a.title = p; a.onclick = (e) => { e.preventDefault(); this.app.workspace.openLinkText(p, '', false); }; });
        }
        const footer = bubble.createDiv({ cls: 'real-chat-msgfooter' });
        if (m.cost != null) footer.createSpan({ cls: 'real-chat-msgcost', text: (m.tok || 0).toLocaleString() + ' tok \u00b7 $' + m.cost.toFixed(4) });
        const mk = (label, fn) => { const b = footer.createEl('button', { text: label, cls: 'real-chat-mini' }); b.onclick = fn; };
        if (long) mk(m.collapsed ? 'Expand' : 'Collapse', () => { m.collapsed = !m.collapsed; this.renderMessages(); });
        mk('Copy', () => { navigator.clipboard.writeText(m.content || ''); new Notice('Copied'); });
        mk('Insert', () => this.insertIntoActiveNote(m.content || ''));
        mk('New note', () => this.newNoteFrom(m.content || ''));
        if (idx === msgs.length - 1) { if (m.capHit) mk('Continue', () => this.continueRun()); else mk('Retry', () => this.retryLast()); }
      } else { content.setText(m.content || ''); }
    }
    if (nearBottom) el.scrollTop = el.scrollHeight; else el.scrollTop = prevTop;
    this.updateScrollBtn();
  }

  insertIntoActiveNote(text) { const view = this.app.workspace.getActiveViewOfType(MarkdownView); if (!view) { new Notice('No open note.'); return; } view.editor.replaceRange(text, view.editor.getCursor()); new Notice('Inserted into ' + view.file.basename); }
  async newNoteFrom(text) { const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); try { const f = await this.plugin.ensureFile('Real Chat note ' + stamp + '.md', text); await this.app.workspace.getLeaf(true).openFile(f); } catch (e) { new Notice('Could not create note: ' + e.message); } }
  async exportSession() { const msgs = this.cur().messages.filter(m => m.role === 'user' || m.role === 'assistant'); if (!msgs.length) { new Notice('Nothing to export.'); return; } let md = '# Real Chat export — session ' + (this.active + 1) + '\n\n'; for (const m of msgs) { if (m.role === 'assistant' && !(m.content || '').trim()) continue; md += '## ' + (m.role === 'user' ? 'You' : 'DeepSeek') + (m.time ? ' (' + m.time + ')' : '') + '\n\n' + (m.content || '') + '\n\n'; } const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); try { const f = await this.plugin.ensureFile('Real Chat export ' + stamp + '.md', md); await this.app.workspace.getLeaf(true).openFile(f); new Notice('Exported.'); } catch (e) { new Notice('Export failed: ' + e.message); } }

  archiveSession() {
    const s = this.cur(); const msgs = s.messages.filter(m => m.role === 'user' || m.role === 'assistant'); if (!msgs.length) { new Notice('Nothing to archive.'); return; }
    this.plugin.settings.archive.unshift({ title: s.title || this.deriveTitle(s), when: new Date().toISOString().slice(0, 16).replace('T', ' '), messages: s.messages });
    if (this.plugin.settings.archive.length > 200) this.plugin.settings.archive.length = 200;
    s.messages = []; s.title = ''; s.sessTok = 0; s.sessCost = 0; this.persist(); this.plugin.saveSettings();
    this.renderMessages(); this.refreshTabs(); this.refreshCost(); new Notice('Archived.');
  }
  openHistory() {
    const arch = this.plugin.settings.archive || []; if (!arch.length) { new Notice('No archived chats yet.'); return; }
    new PickerModal(this.app, 'History (loads into this session)', arch.map((a, i) => ({ label: a.when + ' — ' + (a.title || 'untitled'), value: i })), (i) => { this.cur().messages = arch[i].messages.slice(); this.cur().title = arch[i].title; this.persist(); this.renderMessages(); this.refreshTabs(); });
  }
  deriveTitle(s) { const firstUser = s.messages.find(m => m.role === 'user'); return firstUser ? firstUser.content.slice(0, 40) : 'untitled'; }

  async regenChooseModel() {
    let choices;
    if (this.plugin.settings.provider === 'openrouter') {
      const S = this.plugin.settings; const list = S.orModels || [];
      if (!list.length) { new Notice('Load OpenRouter models in settings first.'); return; }
      const byId = {}; for (const m of list) byId[m.id] = m;
      const favs = (S.orFavourites || []).filter(id => byId[id]);
      const recents = (S.orRecents || []).filter(id => byId[id] && !favs.includes(id));
      const pick = [...favs, ...recents]; if (!pick.length) pick.push(...list.slice(0, 8).map(m => m.id));
      choices = pick.map(id => ({ label: byId[id].name, value: id }));
    } else {
      choices = [{ label: 'V4 Pro', value: 'deepseek-v4-pro' }, { label: 'V4 Flash', value: 'deepseek-v4-flash' }];
    }
    new PickerModal(this.app, 'Regenerate last reply with…', choices, async (model) => { this.cur().model = model; this.modelSelect.value = model; this.persist(); await this.retryLast(); });
  }

  pickRecentNote() { const files = this.app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 40); new PickerModal(this.app, 'Attach a note', files.map(f => ({ label: f.path, value: f.path })), async (path) => { const f = this.app.vault.getAbstractFileByPath(path); if (f instanceof TFile) { const body = await this.app.vault.read(f); this.cur().attachments.push({ label: f.basename, content: '[Note "' + f.path + '"]:\n' + body }); this.persist(); this.renderChips(); } }).open(); }
  pinNote() { const files = this.app.vault.getMarkdownFiles().sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 60); new PickerModal(this.app, 'Pin a note (always in context for this session)', files.map(f => ({ label: f.path, value: f.path })), (path) => { this.cur().pinned.push({ label: path.split('/').pop().replace('.md', ''), path: path }); this.persist(); this.renderChips(); new Notice('Pinned.'); }).open(); }
  attachSelection() { const view = this.app.workspace.getActiveViewOfType(MarkdownView); if (!view) { new Notice('No open note.'); return; } const sel = view.editor.getSelection(); if (!sel) { new Notice('No text selected.'); return; } this.cur().attachments.push({ label: 'Selection (' + sel.length + ' chars)', content: '[Selected text from "' + view.file.path + '"]:\n' + sel }); this.persist(); this.renderChips(); new Notice('Selection attached.'); }
  pickAttachment() { const files = this.app.vault.getFiles().filter(f => TEXT_EXTS.includes(extOf(f.path))).sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 60); new PickerModal(this.app, 'Attach a text/data file', files.map(f => ({ label: f.path, value: f.path })), async (path) => { const f = this.app.vault.getAbstractFileByPath(path); if (f instanceof TFile) { const body = await this.app.vault.read(f); this.cur().attachments.push({ label: f.name, content: '[File "' + f.path + '"]:\n' + body }); this.persist(); this.renderChips(); } }).open(); }
  async onDrop(e) { e.preventDefault(); const files = e.dataTransfer && e.dataTransfer.files; if (!files || !files.length) return; for (const file of files) { await this.importFileObject(file); } }
  visionReady() { const s = this.plugin.settings; return s.visionEnabled && s.visionBaseUrl && s.visionKey && s.visionModel; }
  imagesAvailable() { return this.visionReady() || this.plugin.activeModelHasVision(this.sessionModel()); }
  fileToDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('read failed')); r.readAsDataURL(file); }); }
  async addImageAttachment(label, dataUrl) { this.cur().attachments.push({ label: label, image: dataUrl }); this.persist(); this.renderChips(); if (!this.imagesAvailable()) new Notice('Image attached, but the current model cannot see it — pick a multimodal model or set a vision provider in settings.'); else { const reader = this.visionReady() ? this.plugin.settings.visionModel : this.sessionModel(); new Notice('Image attached — ' + reader + ' will read it. It stays attached for follow-up questions; tap × on the chip to remove.'); } }
  async onPaste(e) { const items = e.clipboardData && e.clipboardData.items; if (!items) return; for (const it of items) { if (it.type && it.type.startsWith('image/')) { const file = it.getAsFile(); if (!file) continue; e.preventDefault(); try { const url = await this.fileToDataUrl(file); await this.addImageAttachment('Pasted image', url); } catch (err) { new Notice('Could not read pasted image.'); } } } }
  pickImage() { const files = this.app.vault.getFiles().filter(f => IMAGE_EXTS.includes(extOf(f.path))).sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 60); if (!files.length) { new Notice('No images found in the vault.'); return; } new PickerModal(this.app, 'Attach an image', files.map(f => ({ label: f.path, value: f.path })), async (path) => { const f = this.app.vault.getAbstractFileByPath(path); if (f instanceof TFile) { try { const buf = await this.app.vault.readBinary(f); const b64 = this._arrToB64(buf); const mime = IMAGE_MIME[extOf(path)] || 'image/png'; await this.addImageAttachment(f.name, 'data:' + mime + ';base64,' + b64); } catch (e) { new Notice('Could not read image: ' + e.message); } } }).open(); }

  // Open the OS file picker for an external file (text, CSV, JSON, markdown, image).
  importExternalFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.bmp';
    input.onchange = async () => { const f = input.files && input.files[0]; if (f) await this.importFileObject(f); };
    input.click();
  }

  // Handle a File object (from picker or drop): attach text, or attach as image.
  async importFileObject(file) {
    const ext = extOf(file.name);
    if (IMAGE_EXTS.includes(ext)) { try { const url = await this.fileToDataUrl(file); await this.addImageAttachment(file.name, url); } catch (e) { new Notice('Could not read image ' + file.name); } return; }
    if (TEXT_EXTS.includes(ext)) { try { const text = await file.text(); this.cur().attachments.push({ label: file.name, content: '[File "' + file.name + '"]:\n' + text }); this.persist(); this.renderChips(); new Notice('Attached ' + file.name); } catch (e) { new Notice('Could not read ' + file.name); } return; }
    new Notice('Unsupported file type: ' + ext + '. Attach text, CSV, JSON, markdown or images.');
  }
  _arrToB64(buf) { let binary = ''; const bytes = new Uint8Array(buf); const chunk = 0x8000; for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)); return btoa(binary); }
    pickPrompt() { const prompts = this.plugin.settings.prompts || []; if (!prompts.length) { new Notice('No saved prompts.'); return; } new PickerModal(this.app, 'Insert a saved prompt', prompts.map(p => ({ label: p.name, value: p.text })), (text) => { const cur = this.inputEl.value; this.inputEl.value = cur ? cur + '\n\n' + text : text; this.cur().draft = this.inputEl.value; this.autoGrow(); this.inputEl.focus(); }).open(); }

  stop(i) { if (this.aborters[i]) { try { this.aborters[i].abort(); } catch (e) {} } }
  async retryLast() { const msgs = this.cur().messages; while (msgs.length && msgs[msgs.length - 1].role !== 'user') msgs.pop(); if (!msgs.length) return; const last = msgs.pop(); this.inputEl.value = last.content; this.cur().draft = last.content; this.renderMessages(); await this.handleSend(); }

  estTokens(str) { return Math.ceil((str || '').length / 4); }

  async measureContext(session) {
    const s = this.plugin.settings;
    const sysBase = s.systemPrompt || '';
    const mem = await this.readMemory();
    let ref = '';
    if (session.reference) { const f = this.app.workspace.getActiveFile(); if (f) { try { ref = await this.app.vault.read(f); } catch (e) {} } }
    let pinned = 0; const pinNames = [];
    for (const p of (session.pinned || [])) { const f = this.app.vault.getAbstractFileByPath(p.path); if (f instanceof TFile) { try { const b = await this.app.vault.read(f); pinned += this.estTokens(b); pinNames.push(p.path); } catch (e) {} } }
    let history = 0;
    for (const m of session.messages) { if (m.role === 'user') history += this.estTokens(m.modelContent || m.content); else if (m.role === 'assistant') history += this.estTokens(m.content || ''); else if (m.role === 'tool') history += this.estTokens(m.content || ''); }
    const sys = this.estTokens(sysBase);
    const memory = this.estTokens(mem);
    const refTok = this.estTokens(ref);
    const total = sys + memory + refTok + pinned + history;
    return { sys: sys, memory: memory, ref: refTok, pinned: pinned, pinNames: pinNames, history: history, total: total };
  }

  async refreshContextSize() {
    if (!this.ctxEl) return;
    try { const m = await this.measureContext(this.cur()); this._lastCtx = m; this.ctxEl.setText('ctx ~' + (m.total >= 1000 ? (m.total / 1000).toFixed(1) + 'k' : m.total)); this.ctxEl.title = 'Estimated tokens in your NEXT message. Click for breakdown.'; this.ctxEl.toggleClass('is-heavy', m.total > 60000); }
    catch (e) {}
  }

  async showContextBreakdown() {
    const m = this._lastCtx || await this.measureContext(this.cur());
    const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
    const pct = (n) => m.total ? Math.round(n / m.total * 100) + '%' : '0%';
    const lines = [
      'Estimated context for your NEXT message (rough, ~4 chars/token):',
      '',
      'System prompt:  ' + fmt(m.sys) + '  (' + pct(m.sys) + ')',
      'Memory file:    ' + fmt(m.memory) + '  (' + pct(m.memory) + ')',
      'Ref note:       ' + fmt(m.ref) + '  (' + pct(m.ref) + ')',
      'Pinned notes:   ' + fmt(m.pinned) + '  (' + pct(m.pinned) + ')' + (m.pinNames.length ? '  [' + m.pinNames.join(', ') + ']' : ''),
      'Chat history:   ' + fmt(m.history) + '  (' + pct(m.history) + ')',
      '----------------------------------',
      'Total:          ' + fmt(m.total) + ' tokens',
      '',
      'Levers: trim ' + this.plugin.settings.memoryPath + ', untick Ref note, unpin notes, or clear/archive this session.'
    ];
    new InfoModal(this.app, 'Context breakdown', lines.join('\n')).open();
  }

  async buildContextPrefix(session) {

    let pre = '';
    if (session.reference) { const f = this.app.workspace.getActiveFile(); if (f) { try { pre += '\n\n[Currently open note "' + f.path + '"]:\n' + (await this.app.vault.read(f)); } catch (e) {} } }
    for (const p of (session.pinned || [])) { const f = this.app.vault.getAbstractFileByPath(p.path); if (f instanceof TFile) { try { pre += '\n\n[Pinned note "' + p.path + '"]:\n' + (await this.app.vault.read(f)); } catch (e) {} } }
    for (const a of (session.attachments || [])) { if (a.content) pre += '\n\n' + a.content; }
    return pre;
  }
  async readMemory() { if (!this.plugin.settings.memoryEnabled) return ''; const path = this.plugin.settings.memoryPath; if (!path) return ''; let file = this.app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) { file = await this.plugin.ensureFile(path, MEMORY_TEMPLATE); if (!file) return ''; } try { return await this.app.vault.read(file); } catch (e) { return ''; } }
  async buildSystemPrompt() { let sys = this.plugin.settings.systemPrompt; const mem = await this.readMemory(); if (mem && mem.trim()) sys += '\n\n=== PERSISTENT MEMORY (from ' + this.plugin.settings.memoryPath + ') ===\n' + mem; return sys; }
  persist() { this.plugin.persistSessions(this.sessions); }

  async handleSend() {
    const sessionIndex = this.active, session = this.sessions[sessionIndex];
    if (this.isBusy(sessionIndex)) return;
    const raw = this.inputEl.value.trim(); if (!raw) return;
    const onOR = this.plugin.settings.provider === 'openrouter';
    const providerKey = onOR ? this.plugin.settings.orKey : this.plugin.settings.apiKey;
    if (!providerKey) { new Notice('Set your ' + (onOR ? 'OpenRouter' : 'DeepSeek') + ' API key in settings first.'); return; }
    this.inputEl.value = ''; session.draft = ''; this.autoGrow();
    const openCtx = await this.buildContextPrefix(session);
    const imgs = (session.attachments || []).filter(a => a.image).map(a => a.image);
    session.messages.push({ role: 'user', content: raw, modelContent: raw + openCtx, time: nowStamp(), images: imgs.length ? imgs : undefined });
    // Keep image attachments "sticky" so follow-up questions still reach the vision model (text/data attachments are
    // already folded into modelContent, so drop those). If nothing can see images, clear everything (one-shot warning).
    session.attachments = this.imagesAvailable() ? (session.attachments || []).filter(a => a.image) : []; this.renderChips();
    if (!session.title && session.messages.filter(m => m.role === 'user').length === 1) { session.title = raw.slice(0, 30); }
    this.persist();
    await this._runWithBusy(session, sessionIndex);
  }

  async _runWithBusy(session, sessionIndex) {
    this.busy[sessionIndex] = true; this.aborters[sessionIndex] = new AbortController(); this.timers[sessionIndex] = Date.now();
    if (!this._tick) this._tick = window.setInterval(() => this.updateTimerDisplay(), 200);
    if (this.active === sessionIndex) { this.renderMessages(); this.updateSendBtn(); } this.refreshTabs();
    try { await this.runConversation(session, sessionIndex); }
    catch (e) { if (e.name === 'AbortError') session.messages.push({ role: 'assistant', content: '_(stopped)_', time: nowStamp() }); else { new Notice('Real Chat error: ' + (e.message || e)); session.messages.push({ role: 'assistant', content: 'Error: ' + (e.message || e), time: nowStamp() }); } }
    finally { this.busy[sessionIndex] = false; this.aborters[sessionIndex] = null; this.timers[sessionIndex] = null; this.persist(); if (this.active === sessionIndex) { this.renderMessages(); this.updateSendBtn(); this.updateTimerDisplay(); } this.refreshTabs(); this.refreshCost(); this.refreshContextSize(); }
  }

  // Resume a conversation that stopped at the tool-step cap (drops the pause notice, runs another batch of steps).
  async continueRun() {
    const sessionIndex = this.active, session = this.sessions[sessionIndex];
    if (this.isBusy(sessionIndex)) return;
    const msgs = session.messages;
    if (msgs.length && msgs[msgs.length - 1].capHit) msgs.pop();
    await this._runWithBusy(session, sessionIndex);
  }

  async buildApiMessages(session, opts) {
    // stripLoneSurrogates on every outgoing string guards against corrupted text (search snippets,
    // truncated emoji in notes, bad clipboard data) triggering a provider 400 on the whole request.
    const out = [{ role: 'system', content: stripLoneSurrogates(await this.buildSystemPrompt()) }];
    const attachImages = (opts && opts.forceImages) || this.plugin.activeModelHasVision(this.sessionModel());
    for (const m of session.messages) {
      if (m.role === 'user') {
        const text = stripLoneSurrogates(m.modelContent || m.content);
        if (attachImages && m.images && m.images.length) {
          const parts = [{ type: 'text', text: text }];
          for (const img of m.images) parts.push({ type: 'image_url', image_url: { url: img } });
          out.push({ role: 'user', content: parts });
        } else {
          out.push({ role: 'user', content: text });
        }
      } else if (m.role === 'assistant') { const msg = { role: 'assistant', content: stripLoneSurrogates(m.content || '') }; if (m.tool_calls) msg.tool_calls = m.tool_calls; out.push(msg); }
      else if (m.role === 'tool') out.push({ role: 'tool', tool_call_id: m.tool_call_id, content: stripLoneSurrogates(m.content) });
    }
    return out;
  }

  async runConversation(session, sessionIndex) {
    const toolsUsed = [];
    const touchedFiles = [];
    this._touchedFiles = touchedFiles;
    const lastUser = [...session.messages].reverse().find(m => m.role === 'user');
    const wantVision = !!(lastUser && lastUser.images && lastUser.images.length);
    const nativeVision = wantVision && this.plugin.activeModelHasVision(this.sessionModel());
    // Pick the driver. When the active model can't see the attached image, run the SAME tool loop but
    // against the vision provider (e.g. Gemini), passing the image inline — so it can both see the image
    // AND call vault tools (save_attached_image, create_note, …) in one go.
    let driver = null, forceImages = false, via = null;
    if (wantVision && !nativeVision) {
      if (!this.visionReady()) { session.messages.push({ role: 'assistant', content: 'You attached an image, but the current model cannot see images and no vision provider is configured. Either pick a multimodal OpenRouter model, or turn on a vision provider in settings.', time: nowStamp() }); return; }
      const s = this.plugin.settings;
      driver = { baseUrl: s.visionBaseUrl, key: s.visionKey, model: s.visionModel, headers: {} };
      forceImages = true; via = 'vision';
    }
    // Make the pasted image bytes available to the save_attached_image tool during this run.
    this._pendingImages = wantVision ? (lastUser.images || []) : null;
    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const apiMessages = await this.buildApiMessages(session, { forceImages: forceImages });
      const streamMsg = { role: 'assistant', content: '', reasoning: '', time: nowStamp(), streaming: true, via: via || undefined }; let used = false;
      const result = await this.callDeepSeekStream(apiMessages, this.aborters[sessionIndex], (delta, kind) => { if (!used) { used = true; session.messages.push(streamMsg); } if (kind === 'reasoning') streamMsg.reasoning += delta; else streamMsg.content += delta; if (this.sessions[this.active] === session) this.renderMessages(); }, driver);
      if (used) { const i = session.messages.indexOf(streamMsg); if (i >= 0) session.messages.splice(i, 1); }
      let turnCost = 0, turnTok = 0;
      if (result.usage) {
        if (via === 'vision') { turnTok = (result.usage.prompt_tokens || 0) + (result.usage.completion_tokens || 0); session.sessTok = (session.sessTok || 0) + turnTok; }   // vision provider isn't billed against DeepSeek/OpenRouter pricing
        else { const r = this.plugin.recordUsage(result.usage, this.sessionModel()); turnCost = r.cost; turnTok = r.tok; session.sessTok = (session.sessTok || 0) + r.tok; session.sessCost = (session.sessCost || 0) + r.cost; }
      }
      const msg = result.message;
      if (msg.tool_calls && msg.tool_calls.length > 0) { session.messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls, via: via || undefined }); for (const tc of msg.tool_calls) { toolsUsed.push(tc.function.name); const r = await this.executeTool(tc); session.messages.push({ role: 'tool', tool_call_id: tc.id, content: r }); } if (this.sessions[this.active] === session) { this.renderMessages(); this.refreshCost(); } continue; }
      session.messages.push({ role: 'assistant', content: msg.content || '', reasoning: msg.reasoning || '', time: nowStamp(), cost: turnCost, tok: turnTok, tools: toolsUsed.slice(), files: touchedFiles.slice(), model: via === 'vision' ? this.plugin.settings.visionModel : this.sessionModel(), via: via || undefined });
      if (this.sessions[this.active] === session) this.refreshCost();
      return;
    }
    session.messages.push({ role: 'assistant', content: 'Reached the ' + MAX_TOOL_STEPS + '-step tool limit, so I paused. The task may be unfinished — press **Continue** to let me keep going.', time: nowStamp(), capHit: true });
    if (this.sessions[this.active] === session) this.renderMessages();
  }

  async callDeepSeekStream(apiMessages, aborter, onDelta, driver) {
    const st = this.plugin.settings;
    const activeTools = TOOLS.filter(t => {
      const n = t.function.name;
      if (IS_MOBILE && n === 'run_command') return false;
      if (n === 'save_attached_image' && !(this._pendingImages && this._pendingImages.length)) return false;
      if ((n === 'web_search' || n === 'web_fetch' || n === 'download_file') && !st.webEnabled) return false;
      if (n === 'run_command' && !st.allowRunCommand) return false;
      return true;
    });
    const api = driver || this.plugin.activeApi(this.sessionModel());
    const body = { model: api.model, messages: apiMessages, tools: activeTools, temperature: this.plugin.settings.temperature, stream: true, stream_options: { include_usage: true } };
    const res = await fetch(api.baseUrl.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key }, api.headers), body: JSON.stringify(body), signal: aborter ? aborter.signal : undefined });
    if (!res.ok) { const txt = await res.text(); throw new Error(res.status + ' ' + txt.slice(0, 300)); }
    if (!res.body || !res.body.getReader) { const json = await res.json(); const m = json.choices[0].message || {}; return { message: Object.assign({}, m, { reasoning: m.reasoning_content || m.reasoning || '' }), usage: json.usage }; }
    const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '', content = '', reasoning = '', usage = null; const toolAcc = {};
    while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop(); for (const line of lines) { const t = line.trim(); if (!t.startsWith('data:')) continue; const data = t.slice(5).trim(); if (data === '[DONE]') continue; let obj; try { obj = JSON.parse(data); } catch (e) { continue; } if (obj.usage) usage = obj.usage; const ch = obj.choices && obj.choices[0]; if (!ch) continue; const d = ch.delta || {}; if (d.content) { content += d.content; if (onDelta) onDelta(d.content, 'content'); } const rc = d.reasoning_content != null ? d.reasoning_content : d.reasoning; if (rc) { reasoning += rc; if (onDelta) onDelta(rc, 'reasoning'); } if (d.tool_calls) { for (const tcd of d.tool_calls) { const i = tcd.index || 0; if (!toolAcc[i]) toolAcc[i] = { id: tcd.id || ('call_' + i), type: 'function', function: { name: '', arguments: '' } }; if (tcd.id) toolAcc[i].id = tcd.id; if (tcd.function) { if (tcd.function.name) toolAcc[i].function.name = tcd.function.name; if (tcd.function.arguments) toolAcc[i].function.arguments += tcd.function.arguments; } } } } }
    const tool_calls = Object.keys(toolAcc).length ? Object.values(toolAcc) : undefined;
    return { message: { role: 'assistant', content: content, reasoning: reasoning, tool_calls: tool_calls }, usage: usage };
  }

  _touch(path) { if (!path) return; if (!this._touchedFiles) this._touchedFiles = []; if (!this._touchedFiles.includes(path)) this._touchedFiles.push(path); }

  async executeTool(toolCall) {
    let args; try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (e) { return 'Error: bad tool arguments.'; }
    const name = toolCall.function.name; const vault = this.app.vault;
    if (name === 'read_note') { const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path; try { return await vault.read(f); } catch (e) { return 'Error: ' + e.message; } }
    if (name === 'list_notes') { const pre = (args.folder || '').trim(); return vault.getMarkdownFiles().map(f => f.path).filter(p => !pre || p.startsWith(pre)).sort().slice(0, 500).join('\n') || '(none)'; }
    if (name === 'search_vault') {
      const raw = (args.query || '').trim(); if (!raw) return 'Error: empty query.';
      const limit = Math.min(Math.max(parseInt(args.limit, 10) || 15, 1), 50);
      const all = await this.plugin.searchVaultRanked(raw, args.folder);
      if (!all.length) return 'No matches for "' + raw + '". Try broader or different keywords, or call search_vault again with synonyms.';
      const top = all.slice(0, limit);
      return 'Found ' + all.length + ' matching note' + (all.length === 1 ? '' : 's') + ' (top ' + top.length + ', most relevant first):\n\n' +
        top.map(r => '[[' + r.path + ']]  (matched: ' + r.where + ')\n  …' + r.snip + '…').join('\n\n');
    }
    if (name === 'remember') { try { const f = await this.plugin.ensureFile(this.plugin.settings.memoryPath, MEMORY_TEMPLATE); const stamp = new Date().toISOString().slice(0, 10); const ex = await vault.read(f); await vault.modify(f, ex + '\n- (' + stamp + ') ' + (args.note || '').trim()); new Notice('Remembered.'); return 'Saved to memory.'; } catch (e) { return 'Error: ' + e.message; } }
    if (name === 'append_note') { try { const f = await this.plugin.ensureFile(args.path, ''); const ex = await vault.read(f); const sep = ex && !ex.endsWith('\n') ? '\n' : ''; await vault.modify(f, ex + sep + (args.text || '')); this._touch(args.path); new Notice('Appended to ' + args.path); return 'Appended to ' + args.path; } catch (e) { return 'Error: ' + e.message; } }
    if (name === 'create_note') { if (vault.getAbstractFileByPath(args.path)) return 'Error: exists at ' + args.path; if (!(await this.maybeConfirm('Create note', args.path, args.content || ''))) return 'User cancelled.'; try { await this.plugin.ensureFile(args.path, args.content || ''); this._touch(args.path); new Notice('Created ' + args.path); return 'Created ' + args.path; } catch (e) { return 'Error: ' + e.message; } }
    if (name === 'edit_note') { const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path; let old = ''; try { old = await vault.read(f); } catch (e) {} const delta = Math.abs((args.content || '').length - old.length); if (!(await this.maybeConfirm('Edit note', args.path, args.content || '', delta))) return 'User cancelled.'; try { await vault.modify(f, args.content || ''); this._touch(args.path); new Notice('Edited ' + args.path); return 'Edited ' + args.path; } catch (e) { return 'Error: ' + e.message; } }
    if (name === 'download_file') {
      try {
        let url = args.url || ''; if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        const resp = await requestUrl({ url: url, method: 'GET' });
        const buf = resp.arrayBuffer;
        if (!buf) return 'Error: no data returned.';
        let path = (args.path || '').trim();
        if (!path) { let base = url.split('?')[0].split('/').pop() || 'download'; if (!base.includes('.')) base += '.bin'; path = (this.plugin.settings.downloadFolder || 'Attachments').replace(/\/$/, '') + '/' + base; }
        const parts = path.split('/'); if (parts.length > 1) { const folder = parts.slice(0, -1).join('/'); if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder).catch(() => {}); }
        const existing = this.app.vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) { await this.app.vault.modifyBinary(existing, buf); } else { await this.app.vault.createBinary(path, buf); }
        this._touch(path); new Notice('Downloaded ' + path);
        return 'Saved to ' + path + '. Embed it with ![[' + path + ']]';
      } catch (e) { return 'Download error: ' + (e.message || e); }
    }
    if (name === 'save_attached_image') {
      const imgs = this._pendingImages || [];
      if (!imgs.length) return 'Error: no image is attached to this message.';
      let idx = parseInt(args.index, 10); if (isNaN(idx) || idx < 0) idx = 0;
      if (idx >= imgs.length) return 'Error: only ' + imgs.length + ' image(s) attached (valid index 0-' + (imgs.length - 1) + ').';
      const m = /^data:([^;]+);base64,(.*)$/.exec(imgs[idx] || '');
      if (!m) return 'Error: the attached image is not in a readable (base64 data URL) format.';
      const extByMime = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp' };
      const ext = extByMime[m[1]] || 'png';
      let path = (args.path || '').trim();
      if (!path) path = (this.plugin.settings.downloadFolder || 'Attachments').replace(/\/$/, '') + '/pasted-image.' + ext;
      if (!/\.[a-z0-9]+$/i.test(path)) path += '.' + ext;
      let buf; try { const bin = atob(m[2]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); buf = bytes.buffer; } catch (e) { return 'Error: could not decode the image data.'; }
      try {
        const parts = path.split('/'); if (parts.length > 1) { const folder = parts.slice(0, -1).join('/'); if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder).catch(() => {}); }
        const existing = vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) await vault.modifyBinary(existing, buf); else await vault.createBinary(path, buf);
        this._touch(path); new Notice('Saved image to ' + path);
        return 'Saved the attached image to ' + path + '. Embed it with ![[' + path + ']]';
      } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'delete_note') {
      const f = vault.getAbstractFileByPath(args.path); if (!f) return 'Error: nothing at ' + args.path;
      if (!(await this.maybeConfirm('Delete', args.path, '(file will be moved to trash)', this.plugin.settings.smallEditThreshold + 1))) return 'User cancelled.';
      try { await this.app.vault.trash(f, true); new Notice('Deleted ' + args.path); return 'Deleted ' + args.path; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'rename_note') {
      const f = vault.getAbstractFileByPath(args.from); if (!f) return 'Error: nothing at ' + args.from;
      try { const parts = (args.to || '').split('/'); if (parts.length > 1) { const folder = parts.slice(0, -1).join('/'); if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder).catch(() => {}); } await this.app.fileManager.renameFile(f, args.to); this._touch(args.to); new Notice('Renamed to ' + args.to); return 'Renamed ' + args.from + ' to ' + args.to; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'replace_in_note') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path;
      try { const body = await vault.read(f); if (!body.includes(args.find)) return 'Error: search text not found in ' + args.path; const updated = args.all ? body.split(args.find).join(args.replace) : body.replace(args.find, args.replace); if (!(await this.maybeConfirm('Replace in note', args.path, args.find + '  ->  ' + args.replace, Math.abs(updated.length - body.length)))) return 'User cancelled.'; await vault.modify(f, updated); this._touch(args.path); new Notice('Updated ' + args.path); return 'Replaced in ' + args.path; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'run_command') {
      if (IS_MOBILE) return 'run_command is not available on mobile.';
      if (!this.plugin.settings.allowRunCommand) return 'run_command is disabled. Enable it in settings (Advanced tools) first.';
      try { const id = args.id || ''; const ok = this.app.commands.executeCommandById(id); return ok ? 'Ran command ' + id : 'Command not found or failed: ' + id; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'web_search') {
      if (!this.plugin.settings.webEnabled) return 'Web access is disabled in settings.';
      try { return await this.plugin.webSearch(args.query || ''); } catch (e) { return 'Search error: ' + (e.message || e); }
    }
    if (name === 'web_fetch') {
      if (!this.plugin.settings.webEnabled) return 'Web access is disabled in settings.';
      try { return await this.plugin.webFetch(args.url || ''); } catch (e) { return 'Fetch error: ' + (e.message || e); }
    }
    if (name === 'image_info') {
      try { const info = await this.plugin.imageInfo(args.path); return info; } catch (e) { return 'Error: ' + (e.message || e); }
    }
    if (name === 'process_image') {
      try { return await this.plugin.processImage(args); } catch (e) { return 'Image error: ' + (e.message || e); }
    }
    if (name === 'batch_process_images') {
      try { return await this.plugin.batchProcessImages(args); } catch (e) { return 'Batch error: ' + (e.message || e); }
    }
    if (name === 'list_files') {
      const pre = (args.folder || '').trim(); const ext = (args.ext || '').replace(/^\./, '').toLowerCase();
      const files = this.app.vault.getFiles().filter(f => extOf(f.path) !== 'md').filter(f => !pre || f.path.startsWith(pre)).filter(f => !ext || extOf(f.path) === ext).map(f => f.path).sort();
      return files.length ? files.slice(0, 500).join('\n') : '(no matching files)';
    }
    if (name === 'create_folder') {
      try { if (this.app.vault.getAbstractFileByPath(args.path)) return 'Folder already exists.'; await this.app.vault.createFolder(args.path); return 'Created folder ' + args.path; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'move_file') {
      const f = vault.getAbstractFileByPath(args.from); if (!f) return 'Error: nothing at ' + args.from;
      try { const parts = (args.to || '').split('/'); if (parts.length > 1) { const folder = parts.slice(0, -1).join('/'); if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder).catch(() => {}); } await this.app.fileManager.renameFile(f, args.to); this._touch(args.to); return 'Moved to ' + args.to; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'file_info') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no file at ' + args.path;
      const kb = (f.stat.size / 1024).toFixed(1); const c = new Date(f.stat.ctime).toLocaleString(); const m = new Date(f.stat.mtime).toLocaleString();
      return args.path + '\nSize: ' + kb + ' KB\nCreated: ' + c + '\nModified: ' + m;
    }
    if (name === 'vault_stats') {
      const md = vault.getMarkdownFiles().length; const all = vault.getFiles();
      const total = all.reduce((s, f) => s + (f.stat.size || 0), 0);
      const largest = [...all].sort((a, b) => b.stat.size - a.stat.size).slice(0, 8).map(f => '  ' + (f.stat.size / 1024).toFixed(0) + ' KB  ' + f.path);
      return 'Notes: ' + md + '\nTotal files: ' + all.length + '\nTotal size: ' + (total / 1048576).toFixed(1) + ' MB\nLargest files:\n' + largest.join('\n');
    }
    if (name === 'read_csv') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no file at ' + args.path;
      try {
        const text = await vault.read(f);
        const rows = text.trim().split(/\r?\n/).map(r => r.split(',').map(c => c.trim()));
        const max = args.maxRows ? Math.min(rows.length, args.maxRows + 1) : rows.length;
        const view = rows.slice(0, max);
        if (args.asTable === false) return view.map(r => r.join(', ')).join('\n');
        if (!view.length) return '(empty)';
        const head = view[0]; const body = view.slice(1);
        let md = '| ' + head.join(' | ') + ' |\n| ' + head.map(() => '---').join(' | ') + ' |\n';
        for (const r of body) md += '| ' + r.join(' | ') + ' |\n';
        return md + (rows.length > max ? '\n(' + (rows.length - max) + ' more rows)' : '');
      } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'read_json') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no file at ' + args.path;
      try { const text = await vault.read(f); return '```json\n' + JSON.stringify(JSON.parse(text), null, 2).slice(0, 12000) + '\n```'; } catch (e) { return 'Error parsing JSON: ' + e.message; }
    }
    if (name === 'get_frontmatter') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path;
      const cache = this.app.metadataCache.getFileCache(f); const fm = cache && cache.frontmatter ? cache.frontmatter : {};
      const clean = Object.assign({}, fm); delete clean.position;
      return Object.keys(clean).length ? '```json\n' + JSON.stringify(clean, null, 2) + '\n```' : '(no frontmatter)';
    }
    if (name === 'set_frontmatter') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path;
      try {
        await this.app.fileManager.processFrontMatter(f, (fm) => {
          if (args.asList) fm[args.key] = String(args.value).split(',').map(s => s.trim()).filter(Boolean);
          else { const v = args.value; fm[args.key] = (v === 'true') ? true : (v === 'false') ? false : (v !== '' && !isNaN(v) ? Number(v) : v); }
        });
        this._touch(args.path); return 'Set ' + args.key + ' on ' + args.path;
      } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'add_tag') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path;
      try {
        await this.app.fileManager.processFrontMatter(f, (fm) => {
          let tags = fm.tags || []; if (typeof tags === 'string') tags = [tags];
          const t = String(args.tag).replace(/^#/, ''); if (!tags.includes(t)) tags.push(t); fm.tags = tags;
        });
        this._touch(args.path); return 'Added tag ' + args.tag + ' to ' + args.path;
      } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'find_backlinks') {
      const target = args.path.replace(/\.md$/, ''); const base = target.split('/').pop();
      const out = [];
      for (const f of vault.getMarkdownFiles()) {
        let body; try { body = await vault.read(f); } catch (e) { continue; }
        const re = /\[\[([^\]|#]+)/g; let m;
        while ((m = re.exec(body))) { const link = m[1].trim(); if (link === target || link === base) { out.push('[[' + f.path + ']]'); break; } }
      }
      return out.length ? out.join('\n') : 'No backlinks found.';
    }
    if (name === 'find_orphans') {
      const files = vault.getMarkdownFiles(); const linked = new Set(); const hasOut = new Set();
      const nameToPath = {}; for (const f of files) { nameToPath[f.basename] = f.path; nameToPath[f.path.replace(/\.md$/, '')] = f.path; }
      for (const f of files) { let body; try { body = await vault.read(f); } catch (e) { continue; } const re = /\[\[([^\]|#]+)/g; let m; let any = false; while ((m = re.exec(body))) { const t = m[1].trim(); const p = nameToPath[t]; if (p) { linked.add(p); any = true; } } if (any) hasOut.add(f.path); }
      const orphans = files.filter(f => !linked.has(f.path) && !hasOut.has(f.path)).map(f => f.path);
      return orphans.length ? orphans.slice(0, 200).join('\n') : 'No orphan notes.';
    }
    if (name === 'find_broken_links') {
      const files = vault.getMarkdownFiles(); const exists = new Set(); for (const f of files) { exists.add(f.basename); exists.add(f.path.replace(/\.md$/, '')); }
      const broken = [];
      for (const f of files) { let body; try { body = await vault.read(f); } catch (e) { continue; } const re = /\[\[([^\]|#]+)/g; let m; while ((m = re.exec(body))) { const t = m[1].trim(); if (!exists.has(t)) broken.push(f.path + ' -> [[' + t + ']]'); } }
      return broken.length ? broken.slice(0, 200).join('\n') : 'No broken links.';
    }
    if (name === 'word_count') {
      const f = vault.getAbstractFileByPath(args.path); if (!(f instanceof TFile)) return 'Error: no note at ' + args.path;
      try { const body = await vault.read(f); const words = (body.trim().match(/\S+/g) || []).length; const chars = body.length; const mins = Math.max(1, Math.round(words / 220)); return args.path + '\nWords: ' + words + '\nCharacters: ' + chars + '\nReading time: ~' + mins + ' min'; } catch (e) { return 'Error: ' + e.message; }
    }
    if (name === 'date_math') {
      const fmt = (d) => d.toISOString().slice(0, 10);
      try {
        if (args.op === 'today') { const d = new Date(); return fmt(d) + ' (' + d.toLocaleDateString(undefined, { weekday: 'long' }) + ')'; }
        if (args.op === 'offset') { const d = args.base ? new Date(args.base) : new Date(); if (args.days) d.setDate(d.getDate() + args.days); if (args.weeks) d.setDate(d.getDate() + args.weeks * 7); if (args.months) d.setMonth(d.getMonth() + args.months); return fmt(d) + ' (' + d.toLocaleDateString(undefined, { weekday: 'long' }) + ')'; }
        if (args.op === 'diff') { const a = new Date(args.base); const b = new Date(args.to); const days = Math.round((b - a) / 86400000); return days + ' days (' + Math.abs(days) + ' days ' + (days >= 0 ? 'after' : 'before') + ').'; }
        return 'Error: unknown op.';
      } catch (e) { return 'Error: ' + e.message; }
    }
    return 'Error: unknown tool ' + name;
  }

  async maybeConfirm(action, path, content, deltaOverride) { if (this.sessionYolo()) return true; const size = deltaOverride != null ? deltaOverride : (content || '').length; if (size <= this.plugin.settings.smallEditThreshold) return true; return await new Promise((resolve) => new ConfirmModal(this.app, action + ': ' + path, content, resolve).open()); }

  _addNavGrip(bottomRow) {
    // Nav bar starts fully hidden (off-screen); grip lives inline in the bottom toolbar row.
    document.body.addClass('real-chat-nav-hidden');
    this._navUp = false;

    const grip = bottomRow.createDiv({ cls: 'real-chat-navgrip' });
    grip.setAttr('aria-label', 'Show navigation bar');
    for (let i = 0; i < 6; i++) grip.createDiv({ cls: 'real-chat-navgrip-dot' });
    this._navGrip = grip;

    const showBar = () => { document.body.removeClass('real-chat-nav-hidden'); document.body.addClass('real-chat-nav-up'); grip.addClass('is-up'); this._navUp = true; };
    const hideBar = () => { document.body.addClass('real-chat-nav-hidden'); document.body.removeClass('real-chat-nav-up'); grip.removeClass('is-up'); this._navUp = false; };
    this._hideNavBar = hideBar;

    grip.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this._navUp ? hideBar() : showBar(); });

    // Auto-hide: tapping any button on Obsidian's nav bar dismisses it again
    this._navTapHandler = (e) => {
      if (!this._navUp) return;
      const nav = document.querySelector('.mobile-navbar');
      if (nav && nav.contains(e.target)) setTimeout(hideBar, 150);
    };
    document.addEventListener('click', this._navTapHandler, true);
  }

  _teardownNavGrip() {
    document.body.removeClass('real-chat-nav-hidden');
    document.body.removeClass('real-chat-nav-up');
    if (this._navTapHandler) document.removeEventListener('click', this._navTapHandler, true);
    this._navGrip = null;
    this._hideNavBar = null;
    this._navTapHandler = null;
  }

  onClose() { if (this._tick) { window.clearInterval(this._tick); this._tick = null; } if (IS_MOBILE) this._teardownNavGrip(); }
}

class GageChatSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; containerEl.empty();
    const S = this.plugin.settings;
    const save = async () => { await this.plugin.saveSettings(); };

    try {
      containerEl.createEl('h3', { text: 'Provider' });
      new Setting(containerEl).setName('Provider').setDesc('DeepSeek direct (cheapest, cache-aware pricing) or OpenRouter (one key, 300+ models incl. Claude, GPT, Gemini).')
        .addDropdown((d) => { d.addOption('deepseek', 'DeepSeek direct'); d.addOption('openrouter', 'OpenRouter'); d.setValue(S.provider); d.onChange(async (v) => { S.provider = v; await save(); this.display(); this.plugin.refreshViews(); }); });

      if (S.provider === 'openrouter') {
        new Setting(containerEl).setName('OpenRouter API key').setDesc('From openrouter.ai/keys')
          .addText((t) => { t.inputEl.type = 'password'; t.setPlaceholder('sk-or-...'); t.setValue(S.orKey); t.onChange(async (v) => { S.orKey = v.trim(); await save(); }); });

        const modelSetting = new Setting(containerEl).setName('Default model')
          .setDesc((S.orModels && S.orModels.length) ? (S.orModels.length + ' models loaded. Out price shown per million tokens.') : 'Load the model list first.');
        let dd;
        modelSetting.addDropdown((d) => {
          dd = d;
          if (S.orModels && S.orModels.length) {
            for (const m of S.orModels) { const p = m.outPrice ? ' ($' + (m.outPrice * 1e6).toFixed(2) + '/M)' : ' (free)'; d.addOption(m.id, m.name + p); }
            d.setValue(S.orModel);
          } else { d.addOption(S.orModel || 'deepseek/deepseek-chat', S.orModel || 'deepseek/deepseek-chat'); }
          d.onChange(async (v) => { S.orModel = v; await save(); this.plugin.refreshViews(); });
        });
        modelSetting.addButton((b) => { b.setButtonText('Load / refresh models').onClick(async () => {
          b.setButtonText('Loading...'); b.setDisabled(true);
          await this.plugin.fetchOpenRouterModels(true);
          new Notice('Loaded ' + (S.orModels ? S.orModels.length : 0) + ' models'); this.display(); this.plugin.refreshViews();
        }); });
        const ortip = containerEl.createEl('p', { text: 'Per-model pricing is fetched live from OpenRouter and used for accurate cost tracking. Tip: pick a model that supports tool calling so vault tools keep working.' });
        ortip.style.fontSize = '12px'; ortip.style.color = 'var(--text-muted)';

        // Favourites manager
        if (S.orModels && S.orModels.length) {
          containerEl.createEl('h3', { text: 'Favourite models' });
          const fd = containerEl.createEl('p', { text: 'Starred models appear at the top of the model selector. Recently used models also surface automatically.' });
          fd.style.fontSize = '12px'; fd.style.color = 'var(--text-muted)';
          const search = containerEl.createEl('input', { attr: { type: 'text', placeholder: 'Filter models to star…' } });
          search.style.cssText = 'width:100%;margin-bottom:8px;padding:7px 10px;border-radius:8px;background:var(--background-primary);color:var(--text-normal);border:1px solid var(--background-modifier-border);';
          const favBox = containerEl.createDiv();
          favBox.style.cssText = 'max-height:240px;overflow-y:auto;border:1px solid var(--background-modifier-border);border-radius:8px;';
          const renderFavs = (filter) => {
            favBox.empty();
            const f = (filter || '').toLowerCase();
            const favs = S.orFavourites || [];
            const sorted = [...S.orModels].sort((a, b) => (favs.includes(b.id) - favs.includes(a.id)) || a.name.localeCompare(b.name));
            let shown = 0;
            for (const m of sorted) {
              if (f && !(m.name.toLowerCase().includes(f) || m.id.toLowerCase().includes(f))) continue;
              if (shown >= 60) break; shown++;
              const row = favBox.createDiv(); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--background-modifier-border);cursor:pointer;font-size:13px;';
              const on = (S.orFavourites || []).includes(m.id);
              const star = row.createSpan({ text: on ? '\u2605' : '\u2606' }); star.style.cssText = 'font-size:16px;color:' + (on ? 'var(--text-accent)' : 'var(--text-faint)') + ';';
              const name = row.createSpan({ text: m.name }); name.style.flex = '1';
              const price = row.createSpan({ text: m.outPrice ? '$' + (m.outPrice * 1e6).toFixed(2) + '/M' : 'free' }); price.style.cssText = 'font-size:11px;color:var(--text-faint);font-family:var(--font-monospace);';
              row.onclick = async () => {
                S.orFavourites = S.orFavourites || [];
                if (S.orFavourites.includes(m.id)) S.orFavourites = S.orFavourites.filter(x => x !== m.id);
                else S.orFavourites = [...S.orFavourites, m.id];
                await save(); renderFavs(search.value); this.plugin.refreshViews();
              };
            }
            if (!shown) favBox.createDiv({ text: 'No matches' }).style.cssText = 'padding:10px;color:var(--text-faint);font-size:13px;';
          };
          search.oninput = () => renderFavs(search.value);
          renderFavs('');
        }
      } else {
        new Setting(containerEl).setName('DeepSeek API key').setDesc('Stored in plugin data; syncs with plugin sync on.')
          .addText((t) => { t.inputEl.type = 'password'; t.setPlaceholder('sk-...'); t.setValue(S.apiKey); t.onChange(async (v) => { S.apiKey = v.trim(); await save(); }); });
        new Setting(containerEl).setName('Base URL')
          .addText((t) => { t.setValue(S.baseUrl); t.onChange(async (v) => { S.baseUrl = v.trim(); await save(); }); });
        new Setting(containerEl).setName('Default model')
          .addDropdown((d) => { d.addOption('deepseek-v4-pro', 'DeepSeek V4 Pro'); d.addOption('deepseek-v4-flash', 'DeepSeek V4 Flash'); d.setValue(S.model); d.onChange(async (v) => { S.model = v; await save(); }); });
      }

      new Setting(containerEl).setName('YOLO mode (global default)').setDesc('Apply ALL file changes with no confirmation. Per-session override via the header badge.')
        .addToggle((t) => { t.setValue(S.yolo); t.onChange(async (v) => { S.yolo = v; await save(); this.plugin.refreshViews(); }); });

      containerEl.createEl('h3', { text: 'Vision provider (for images)' });
      const vd = containerEl.createEl('p', { text: 'Fallback for image input. When the active model is natively multimodal (most big OpenRouter models, marked with an image icon in the model list), images go straight to it and this provider is not used. It is only used when the current model cannot see images itself (e.g. DeepSeek direct, or a text-only model). Off by default.' });
      vd.style.fontSize = '12px'; vd.style.color = 'var(--text-muted)';
      new Setting(containerEl).setName('Enable vision provider')
        .addToggle((t) => { t.setValue(S.visionEnabled); t.onChange(async (v) => { S.visionEnabled = v; await save(); }); });
      new Setting(containerEl).setName('Vision base URL').setDesc('OpenAI-compatible /chat/completions endpoint, without the trailing path. e.g. Gemini: https://generativelanguage.googleapis.com/v1beta/openai')
        .addText((t) => { t.setPlaceholder('https://...'); t.setValue(S.visionBaseUrl); t.onChange(async (v) => { S.visionBaseUrl = v.trim(); await save(); }); });
      new Setting(containerEl).setName('Vision API key')
        .addText((t) => { t.inputEl.type = 'password'; t.setPlaceholder('key for the vision provider'); t.setValue(S.visionKey); t.onChange(async (v) => { S.visionKey = v.trim(); await save(); }); });
      new Setting(containerEl).setName('Vision model').setDesc('e.g. gemini-2.5-flash, or an OpenRouter model id like google/gemini-2.5-flash')
        .addText((t) => { t.setPlaceholder('model id'); t.setValue(S.visionModel); t.onChange(async (v) => { S.visionModel = v.trim(); await save(); }); });

      containerEl.createEl('h3', { text: 'Web access' });
      const wd = containerEl.createEl('p', { text: 'Lets the model search the web and fetch pages (like Claudian). Uses Obsidian requestUrl, so it bypasses browser CORS. DuckDuckGo needs no key; add a Brave or Tavily key for more reliable search.' });
      wd.style.fontSize = '12px'; wd.style.color = 'var(--text-muted)';
      new Setting(containerEl).setName('Enable web access').setDesc('Adds web_search and web_fetch tools.')
        .addToggle((t) => { t.setValue(S.webEnabled); t.onChange(async (v) => { S.webEnabled = v; await save(); }); });
      new Setting(containerEl).setName('Search provider')
        .addDropdown((d) => { d.addOption('duckduckgo', 'DuckDuckGo (no key)'); d.addOption('brave', 'Brave (key)'); d.addOption('tavily', 'Tavily (key)'); d.setValue(S.searchProvider); d.onChange(async (v) => { S.searchProvider = v; await save(); }); });
      new Setting(containerEl).setName('Brave API key')
        .addText((t) => { t.inputEl.type = 'password'; t.setPlaceholder('optional'); t.setValue(S.braveKey); t.onChange(async (v) => { S.braveKey = v.trim(); await save(); }); });
      new Setting(containerEl).setName('Tavily API key')
        .addText((t) => { t.inputEl.type = 'password'; t.setPlaceholder('optional'); t.setValue(S.tavilyKey); t.onChange(async (v) => { S.tavilyKey = v.trim(); await save(); }); });
      new Setting(containerEl).setName('Max characters per fetched page').setDesc('Trims long pages to keep token use sane.')
        .addText((t) => { t.setValue(String(S.webMaxChars)); t.onChange(async (v) => { const n = parseInt(v, 10); if (!isNaN(n)) { S.webMaxChars = n; await save(); } }); });

      new Setting(containerEl).setName('Download folder').setDesc('Where download_file saves covers/images when no path is given.')
        .addText((t) => { t.setValue(S.downloadFolder); t.onChange(async (v) => { S.downloadFolder = v.trim(); await save(); }); });

      if (!IS_MOBILE) {
      containerEl.createEl('h3', { text: 'Advanced tools (off by default)' });
      const ad = containerEl.createEl('p', { text: 'Lets the model trigger Obsidian commands by id. Leave off unless you want it.' });
      ad.style.fontSize = '12px'; ad.style.color = 'var(--text-error, var(--text-muted))';
      new Setting(containerEl).setName('Allow run_command').setDesc('Lets the model trigger Obsidian commands by id.')
        .addToggle((t) => { t.setValue(S.allowRunCommand); t.onChange(async (v) => { S.allowRunCommand = v; await save(); }); });
      }

      containerEl.createEl('h3', { text: 'Memory' });
      new Setting(containerEl).setName('Memory file')
        .addText((t) => { t.setValue(S.memoryPath); t.onChange(async (v) => { S.memoryPath = v.trim(); await save(); }); });
      new Setting(containerEl).setName('Enable memory')
        .addToggle((t) => { t.setValue(S.memoryEnabled); t.onChange(async (v) => { S.memoryEnabled = v; await save(); this.plugin.refreshViews(); }); });
      new Setting(containerEl).setName('Help note folder')
        .addText((t) => { t.setValue(S.helpFolder); t.onChange(async (v) => { S.helpFolder = v.trim(); await save(); }); });

      containerEl.createEl('h3', { text: 'Saved prompts' });
      if (!Array.isArray(S.prompts)) S.prompts = [];
      S.prompts.forEach((p, idx) => {
        if (!p || typeof p !== 'object') return;
        new Setting(containerEl).setName(typeof p.name === 'string' ? p.name : 'Prompt')
          .addText((t) => { t.setValue(typeof p.name === 'string' ? p.name : ''); t.onChange(async (v) => { p.name = v; await save(); }); })
          .addTextArea((t) => { t.inputEl.rows = 2; t.setValue(typeof p.text === 'string' ? p.text : ''); t.onChange(async (v) => { p.text = v; await save(); }); })
          .addButton((b) => { b.setButtonText('Delete'); b.onClick(async () => { S.prompts.splice(idx, 1); await save(); this.display(); }); });
      });
      new Setting(containerEl).addButton((b) => { b.setButtonText('Add prompt'); b.onClick(async () => { S.prompts.push({ name: 'New prompt', text: '' }); await save(); this.display(); }); });

      containerEl.createEl('h3', { text: 'Behaviour' });
      new Setting(containerEl).setName('Auto-apply threshold (characters)').setDesc('Ignored when YOLO is on.')
        .addText((t) => { t.setValue(String(S.smallEditThreshold)); t.onChange(async (v) => { const n = parseInt(v, 10); if (!isNaN(n)) { S.smallEditThreshold = n; await save(); } }); });
      new Setting(containerEl).setName('System prompt')
        .addTextArea((t) => { t.inputEl.rows = 10; t.inputEl.style.width = '100%'; t.setValue(S.systemPrompt); t.onChange(async (v) => { S.systemPrompt = v; await save(); }); });

      containerEl.createEl('h3', { text: 'Pricing (USD per 1M tokens)' });
      const priceFields = [['priceProIn', 'V4 Pro input (cache miss)'], ['priceProCache', 'V4 Pro input (cache hit)'], ['priceProOut', 'V4 Pro output'], ['priceFlashIn', 'V4 Flash input (cache miss)'], ['priceFlashCache', 'V4 Flash input (cache hit)'], ['priceFlashOut', 'V4 Flash output']];
      priceFields.forEach((pf) => {
        const cur = S[pf[0]]; const val = (cur == null ? '' : String(cur));
        new Setting(containerEl).setName(pf[1])
          .addText((t) => { t.setValue(val); t.onChange(async (v) => { const n = parseFloat(v); if (!isNaN(n)) { S[pf[0]] = n; await save(); } }); });
      });

      containerEl.createEl('h3', { text: 'Usage' });
      new Setting(containerEl).setName('Clear archive').setDesc(((S.archive || []).length) + ' saved chats.')
        .addButton((b) => { b.setButtonText('Clear'); b.onClick(async () => { S.archive = []; await save(); this.display(); }); });
      new Setting(containerEl).setName('Lifetime total (all sessions)').setDesc(((S.totalInTokens + S.totalOutTokens).toLocaleString()) + ' tokens, $' + S.totalCost.toFixed(4) + '. Per-session totals show in the chat bar.')
        .addButton((b) => { b.setButtonText('Reset lifetime'); b.onClick(async () => { S.totalInTokens = 0; S.totalOutTokens = 0; S.totalCost = 0; await save(); this.plugin.refreshViews(); this.display(); }); });
    } catch (e) {
      containerEl.createEl('p', { text: 'Settings error: ' + (e.message || e) });
      new Setting(containerEl).setName('Reset usage counter (fallback)')
        .addButton((b) => { b.setButtonText('Reset'); b.onClick(async () => { S.totalInTokens = 0; S.totalOutTokens = 0; S.totalCost = 0; await save(); this.plugin.refreshViews(); this.display(); }); });
    }
  }
}

module.exports = class GageChatPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_GAGE_CHAT, (leaf) => new GageChatView(leaf, this));
    this.addRibbonIcon('message-square', 'Open Real Chat', () => this.activateView());
    this.addCommand({ id: 'open-real-chat', name: 'Open Real Chat', callback: () => this.activateView() });
    this.addCommand({ id: 'real-chat-open-memory', name: 'Open memory file', callback: () => this.openMemoryFile() });
    this.addCommand({ id: 'real-chat-focus-input', name: 'Focus chat input', callback: () => { this.activateView(); const v = this.firstView(); if (v) setTimeout(() => v.inputEl && v.inputEl.focus(), 120); } });
    this.addCommand({ id: 'real-chat-inline-edit', name: 'Edit selection with Real Chat', editorCallback: (editor, view) => this.inlineEdit(editor, view) });
    this.addCommand({ id: 'real-chat-search-vault', name: 'Search vault (ranked)', callback: () => new VaultSearchModal(this.app, this).open() });
    this.addSettingTab(new GageChatSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => this.writeHelpIfNeeded());
    if (this.settings.provider === 'openrouter' && this.settings.orKey && !(this.settings.orModels && this.settings.orModels.length)) {
      this.fetchOpenRouterModels().then(() => this.refreshViews());
    }
  }
  firstView() { const l = this.app.workspace.getLeavesOfType(VIEW_TYPE_GAGE_CHAT); return l.length ? l[0].view : null; }

  async inlineEdit(editor, view) {
    const sel = editor.getSelection(); if (!sel) { new Notice('Select text first.'); return; }
    new InlineEditModal(this.app, async (instruction) => {
      new Notice('Editing…');
      try {
        const api = this.activeApi();
        const body = { model: api.model, messages: [{ role: 'system', content: 'You rewrite text. Output ONLY the rewritten text, no preamble, no quotes, no explanation.' }, { role: 'user', content: instruction + '\n\nText:\n' + sel }], temperature: this.settings.temperature, stream: false };
        const res = await fetch(api.baseUrl.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key }, api.headers), body: JSON.stringify(body) });
        if (!res.ok) { new Notice('Error ' + res.status); return; }
        const json = await res.json(); if (json.usage) this.recordUsage(json.usage, api.model);
        const out = json.choices[0].message.content || ''; editor.replaceSelection(out); new Notice('Done.');
      } catch (e) { new Notice('Inline edit failed: ' + e.message); }
    }).open();
  }

  async ensureFile(path, template) { let file = this.app.vault.getAbstractFileByPath(path); if (file instanceof TFile) return file; const parts = path.split('/'); if (parts.length > 1) { const folder = parts.slice(0, -1).join('/'); if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder).catch(() => {}); } return await this.app.vault.create(path, template || ''); }
  async openMemoryFile() { const f = await this.ensureFile(this.settings.memoryPath, MEMORY_TEMPLATE); await this.app.workspace.getLeaf(true).openFile(f); }

  async writeHelpIfNeeded() { if (this.settings.lastHelpVersion === this.manifest.version) return; const folder = (this.settings.helpFolder || '_memory').replace(/\/$/, ''); try { const f = await this.ensureFile(folder + '/Real Chat — How to use.md', ''); await this.app.vault.modify(f, this.helpContent()); this.settings.lastHelpVersion = this.manifest.version; await this.saveSettings(); } catch (e) {} }
  helpContent() {
    return [
      '# Real Chat — how to use', '', 'Auto-generated (v' + this.manifest.version + '). Regenerated on each update.', '',
      '## Sessions & history', 'Five chats (1-5), each with own history, draft, model, pins, YOLO setting. Tabs auto-title from your first message.',
      'Histories survive restarts. The ⋯ menu archives a session, opens history (reload any past chat), or exports to a note.', '',
      '## YOLO mode', 'Header badge toggles YOLO for the current session (overrides the global default in settings). When ON, all file',
      'changes apply with NO confirmation. Obsidian file history/trash is still your safety net. "Safe" shows when off.',
      'When Safe asks before a change, the Apply changes / Cancel dialog no longer dismisses if you misclick on the dimmed',
      'background around it — only the buttons (or Escape) decide, so a stray click can\'t silently cancel an edit.', '',
      '## Memory & triggers', 'The file `' + this.settings.memoryPath + '` is read every message. Add a `## Triggers` section with commands like:', '',
      '    - **add book**: when I say "add book <title>", append "- <title>" to "Reading/Reading list.md".', '', 'Type `add book Dune` to run it. "remember this: ..." appends to memory.', '',
      '## Context', '- "Ref note" feeds the open note. "Pin" keeps notes in context for the whole session (📌 chips).',
      '- "@ note" / "Selection" / "Attach" add one-off context. Drag-drop text files too.', '',
      '## Searching the vault', 'Two ways, both ranked (title, heading and tag matches count for more than body text; notes with all your words and',
      'exact phrases rank highest; best matches first):',
      '- Search box: the 🔍 Search button in the chat toolbar, or the command "Search vault (ranked)" (give it a hotkey for',
      '  an Omnisearch-style popup). Type and results appear instantly. Arrow keys to move, Enter or click to open a note.',
      '  No model call, no token cost.',
      '- In chat: just ask ("find my notes about X", or /search). Slower and uses a few tokens, but the model can run several',
      '  synonym searches and reason over the results, so it is better for conceptual "find notes about an idea" questions.', '',
      '## Slash commands', 'Type `/` at the start of a line for a quick menu (/summarise, /search, /rewrite, etc).', '',
      '## Context size', 'The bottom bar shows ctx ~Xk: the estimated tokens in your NEXT message (system + memory + ref + pins + history).',
      'Click it for a breakdown showing what is taking the space. If it is heavy, trim the memory file, untick Ref note,',
      'unpin notes, or clear/archive the session. (This is per-message context, not the running session total next to the cost.)', '',
      '## Replies', 'Clickable links, Copy/Insert/New note/Retry, code blocks have Copy buttons, long replies collapse.',
      'Any note/file the assistant creates or changes is auto-listed with a clickable link under the reply. Replies that ask',
      'you to confirm or decide something get a highlighted left border so they stand out.',
      'Regenerate last reply with a chosen model via the ⋯ menu. Per-reply and lifetime cost shown. A ⏱ timer shows think time.', '',
      '## Inline edit', 'Select text in any note, run "Edit selection with Real Chat" (command palette / hotkey), say how to change it,',
      'and it rewrites in place. No chat round-trip.', '',
      '## Keys & voice', 'Enter sends, Shift+Enter newline, Esc stops. For voice, click the input and press Win+H (Windows dictation).', '',
      '## Jump to latest', 'In a long chat, a round ↓ button appears at the bottom-right when you scroll up. Tap it to jump back to the newest',
      'message (works on mobile too). While you are scrolled up reading, streaming replies no longer yank you to the bottom.', '',
      '## Images & vision', 'DeepSeek has no image model, so images go to a separate provider you set in Settings (Vision provider).',
      'Turn it on, paste a base URL, key and model (e.g. Gemini free tier or OpenRouter). Then paste, drag, or use the Image',
      'button to attach a picture. A notice confirms which model will read it. An attached image STAYS attached (sticky chip)',
      'so follow-up questions about the same picture keep reaching the vision model — tap × on the chip to remove it. While an',
      'image is attached every turn is answered by the vision model and marked "Vision". The vision model runs the FULL tool',
      'loop: it can see the image AND act on it in one go — e.g. "save this and tell me what it says" writes the real picture',
      'into your vault (save_attached_image) and reads it back. It can also create/edit notes and search from what it sees.', '',
      '## Web & files', 'When web access is on (Settings), the model can web_search, web_fetch and download_file.',
      'download_file grabs an image or file from a URL and saves it to your download folder; embed with ![[path]].',
      '## Vault housekeeping', 'It can also delete_note, rename_note and replace_in_note (targeted find/replace, safer than full rewrite).', '',
      '## Advanced tools', 'Off by default (Settings, Advanced tools): run_command lets the model trigger Obsidian commands by id.',
      'Enable only if you are comfortable with that.', '',
      '## Web search note', 'DuckDuckGo needs no key; add a Brave or Tavily key for better search. Uses Obsidian requestUrl, so no CORS issues.', '',
      '## Reasoning models', 'If you use a reasoning model (DeepSeek reasoner, or an OpenRouter thinking model), its chain-of-thought shows in a',
      'collapsible "Thinking" block above the answer. It streams live, then collapses once the reply lands. The thinking is',
      'display-only and is not sent back to the model on later turns.', '',
      '## Long tasks', 'There is a 50-step tool-loop cap per turn. If a task hits it, the reply pauses with a Continue button — press it to',
      'let the model carry on from where it stopped, rather than starting over.', '',
      '## Limits', 'edit_note rewrites whole files. Vision cost is not tracked (DeepSeek pricing only).',
      'Corrupted characters in notes (e.g. a half-emoji from a bad slice or paste) are stripped from requests so they no longer cause a provider 400.', ''
    ].join('\n');
  }

  stripHtml(html) {
    let t = html || '';
    t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    t = t.replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, '\n').replace(/<li[^>]*>/gi, '- ');
    t = t.replace(/<[^>]+>/g, ' ');
    t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
    t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return t;
  }

  async webFetch(url) {
    if (!url) return 'Error: no URL.';
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const resp = await requestUrl({ url: url, method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Real Chat Obsidian plugin)' } });
    const ct = (resp.headers && (resp.headers['content-type'] || resp.headers['Content-Type'])) || '';
    let body = resp.text || '';
    if (ct.includes('application/json')) { return body.slice(0, this.settings.webMaxChars); }
    const text = this.stripHtml(body);
    const max = this.settings.webMaxChars || 6000;
    return '[Fetched ' + url + ']\n\n' + (text.length > max ? text.slice(0, max) + '\n\n…(truncated, ' + text.length + ' chars total)' : text);
  }

  async webSearch(query) {
    if (!query) return 'Error: empty query.';
    const provider = this.settings.searchProvider || 'duckduckgo';
    if (provider === 'brave' && this.settings.braveKey) {
      const resp = await requestUrl({ url: 'https://api.search.brave.com/res/v1/web/search?q=' + encodeURIComponent(query), headers: { 'Accept': 'application/json', 'X-Subscription-Token': this.settings.braveKey } });
      const data = resp.json; const results = (data.web && data.web.results) || [];
      if (!results.length) return 'No results.';
      return results.slice(0, 8).map((r, i) => (i + 1) + '. ' + r.title + '\n   ' + r.url + '\n   ' + (r.description || '')).join('\n\n');
    }
    if (provider === 'tavily' && this.settings.tavilyKey) {
      const resp = await requestUrl({ url: 'https://api.tavily.com/search', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: this.settings.tavilyKey, query: query, max_results: 8 }) });
      const data = resp.json; const results = data.results || [];
      if (!results.length) return 'No results.';
      return results.slice(0, 8).map((r, i) => (i + 1) + '. ' + r.title + '\n   ' + r.url + '\n   ' + (r.content || '').slice(0, 200)).join('\n\n');
    }
    // default: DuckDuckGo HTML (no key)
    const resp = await requestUrl({ url: 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Real Chat Obsidian plugin)' } });
    const html = resp.text || '';
    const out = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && out.length < 8) {
      let href = m[1];
      const dec = href.match(/uddg=([^&]+)/); if (dec) { try { href = decodeURIComponent(dec[1]); } catch (e) {} }
      const title = this.stripHtml(m[2]);
      if (title) out.push({ title: title, url: href });
    }
    if (!out.length) return 'No results (DuckDuckGo returned nothing parseable). Try a Brave or Tavily key in settings for reliable search.';
    return out.map((r, i) => (i + 1) + '. ' + r.title + '\n   ' + r.url).join('\n\n') + '\n\nUse web_fetch on a URL to read it in full.';
  }

  // Ranked keyword search over all notes. Returns a sorted array of
  // { path, title, score, snip, where, mtime }, best first. Shared by the
  // search_vault chat tool and the Search vault modal.
  async searchVaultRanked(query, folder) {
    const raw = (query || '').trim(); if (!raw) return [];
    const phrase = raw.toLowerCase();
    const terms = [...new Set(phrase.split(/\s+/).filter(t => t.length >= 2))];
    if (!terms.length) return [];
    folder = (folder || '').trim();
    const files = this.app.vault.getMarkdownFiles().filter(f => !folder || f.path.startsWith(folder));
    const scored = [];
    for (const f of files) {
      let body; try { body = await this.app.vault.cachedRead(f); } catch (e) { continue; }
      const lcBody = body.toLowerCase();
      const title = f.basename.toLowerCase();
      const cache = this.app.metadataCache.getFileCache(f) || {};
      const headings = (cache.headings || []).map(h => (h.heading || '').toLowerCase());
      const tags = (cache.tags || []).map(t => (t.tag || '').toLowerCase().replace(/^#/, ''));
      if (cache.frontmatter && cache.frontmatter.tags) { const ft = cache.frontmatter.tags; (Array.isArray(ft) ? ft : [ft]).forEach(t => tags.push(String(t).toLowerCase())); }
      let score = 0, matched = 0, firstIdx = -1; const where = new Set();
      for (const term of terms) {
        let hit = false;
        if (title.includes(term)) { score += 10; hit = true; where.add('title'); }
        if (headings.some(h => h.includes(term))) { score += 5; hit = true; where.add('heading'); }
        if (tags.some(t => t.includes(term))) { score += 5; hit = true; where.add('tag'); }
        let idx = lcBody.indexOf(term);
        if (idx >= 0) { hit = true; where.add('body'); if (firstIdx < 0 || idx < firstIdx) firstIdx = idx; let count = 0; while (idx >= 0 && count < 50) { count++; idx = lcBody.indexOf(term, idx + term.length); } score += Math.min(count, 10); }
        if (hit) matched++;
      }
      if (!matched) continue;
      if (terms.length > 1 && matched === terms.length) score += 8;            // all words present
      if (terms.length > 1) { if (title.includes(phrase)) score += 20; const pIdx = lcBody.indexOf(phrase); if (pIdx >= 0) { score += 15; where.add('phrase'); if (firstIdx < 0 || pIdx < firstIdx) firstIdx = pIdx; } }
      const at = firstIdx >= 0 ? firstIdx : 0;
      const snip = stripLoneSurrogates(body.slice(Math.max(0, at - 60), at + 120).replace(/\s+/g, ' ').trim());
      scored.push({ path: f.path, title: f.basename, score: score, snip: snip, where: [...where].join('/'), mtime: f.stat.mtime });
    }
    scored.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
    return scored;
  }

  // Returns the base URL, key, and model for whichever provider is active.
  activeApi(sessionModel) {
    const s = this.settings;
    if (s.provider === 'openrouter') {
      return { baseUrl: 'https://openrouter.ai/api/v1', key: s.orKey, model: sessionModel || s.orModel, headers: { 'HTTP-Referer': 'https://obsidian.md', 'X-Title': 'Real Chat' } };
    }
    return { baseUrl: (s.baseUrl || 'https://api.deepseek.com').replace(/\/$/, ''), key: s.apiKey, model: sessionModel || s.model, headers: {} };
  }

  // True if the currently selected model can accept images directly (OpenRouter multimodal).
  activeModelHasVision(sessionModel) {
    const s = this.settings;
    if (s.provider !== 'openrouter') return false;
    const id = sessionModel || s.orModel;
    const m = (s.orModels || []).find(x => x.id === id);
    return !!(m && m.vision);
  }

  async fetchOpenRouterModels(force) {
    const s = this.settings;
    const fresh = s.orModels && s.orModels.length && (Date.now() - (s.orModelsFetched || 0) < 6 * 3600 * 1000);
    if (fresh && !force) return s.orModels;
    try {
      const res = await requestUrl({ url: 'https://openrouter.ai/api/v1/models', method: 'GET', headers: s.orKey ? { 'Authorization': 'Bearer ' + s.orKey } : {} });
      const json = typeof res.json === 'object' ? res.json : JSON.parse(res.text);
      const list = (json.data || []).map(m => {
        const arch = m.architecture || {};
        const inputs = arch.input_modalities || arch.modality && [arch.modality] || [];
        const vision = Array.isArray(inputs) ? inputs.includes('image') : /image|vision|multimodal/i.test(JSON.stringify(arch));
        return {
          id: m.id,
          name: m.name || m.id,
          inPrice: parseFloat(m.pricing && m.pricing.prompt) || 0,   // per token
          outPrice: parseFloat(m.pricing && m.pricing.completion) || 0,
          ctx: m.context_length || 0,
          vision: !!vision
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
      s.orModels = list; s.orModelsFetched = Date.now(); await this.saveSettings();
      return list;
    } catch (e) { console.warn('OpenRouter models fetch failed', e); return s.orModels || []; }
  }

  // ── Image processing (Canvas API, local, offline) ──────────────────────────
  _imgMime(ext) { const m = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' }; return m[ext] || 'image/png'; }
  _arrToB64Plugin(buf) { let s = ''; const b = new Uint8Array(buf); const c = 0x8000; for (let i = 0; i < b.length; i += c) s += String.fromCharCode.apply(null, b.subarray(i, i + c)); return btoa(s); }

  async _loadImage(path) {
    const f = this.app.vault.getAbstractFileByPath(path);
    if (!(f instanceof TFile)) throw new Error('no image at ' + path);
    const buf = await this.app.vault.readBinary(f);
    const b64 = this._arrToB64Plugin(buf);
    const dataUrl = 'data:' + this._imgMime(extOf(path)) + ';base64,' + b64;
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('could not decode image')); im.src = dataUrl; });
    return { file: f, img: img, bytes: buf.byteLength };
  }

  _dataUrlToArrayBuffer(dataUrl) {
    const b64 = dataUrl.split(',')[1]; const bin = atob(b64); const len = bin.length; const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i); return arr.buffer;
  }

  async imageInfo(path) {
    const { img, bytes } = await this._loadImage(path);
    return path + '\nDimensions: ' + img.naturalWidth + ' x ' + img.naturalHeight + ' px\nFormat: ' + extOf(path).toUpperCase() + '\nSize: ' + (bytes / 1024).toFixed(1) + ' KB';
  }

  // Render the source image to a canvas applying resize/crop/rotate/flip, return the canvas.
  _renderToCanvas(img, opts) {
    let sw = img.naturalWidth, sh = img.naturalHeight;
    let sx = 0, sy = 0;
    if (opts.crop && opts.crop.width && opts.crop.height) { sx = opts.crop.x || 0; sy = opts.crop.y || 0; sw = opts.crop.width; sh = opts.crop.height; }
    // target dimensions
    let tw = sw, th = sh;
    if (opts.maxWidth || opts.maxHeight) {
      const rw = opts.maxWidth ? opts.maxWidth / sw : Infinity;
      const rh = opts.maxHeight ? opts.maxHeight / sh : Infinity;
      const r = Math.min(rw, rh, 1); tw = Math.round(sw * r); th = Math.round(sh * r);
    } else if (opts.scale && opts.scale > 0 && opts.scale !== 1) { tw = Math.round(sw * opts.scale); th = Math.round(sh * opts.scale); }
    const rot = (opts.rotate === 90 || opts.rotate === 180 || opts.rotate === 270) ? opts.rotate : 0;
    const swap = rot === 90 || rot === 270;
    const cv = document.createElement('canvas');
    cv.width = swap ? th : tw; cv.height = swap ? tw : th;
    const ctx = cv.getContext('2d');
    // white background for formats without alpha (jpeg)
    if (opts.format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); }
    ctx.save();
    ctx.translate(cv.width / 2, cv.height / 2);
    if (rot) ctx.rotate(rot * Math.PI / 180);
    let fx = 1, fy = 1; if (opts.flip === 'horizontal') fx = -1; if (opts.flip === 'vertical') fy = -1;
    ctx.scale(fx, fy);
    ctx.drawImage(img, sx, sy, sw, sh, -tw / 2, -th / 2, tw, th);
    ctx.restore();
    return cv;
  }

  _canvasToDataUrl(cv, mime, quality) { return cv.toDataURL(mime, quality); }

  // Find the highest quality whose encoded size is <= targetKB (binary search).
  _compressToTarget(cv, mime, targetKB) {
    const targetBytes = targetKB * 1024;
    let lo = 0.05, hi = 0.95, best = null, bestQ = lo;
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2;
      const du = cv.toDataURL(mime, q);
      const bytes = Math.ceil((du.length - (du.indexOf(',') + 1)) * 3 / 4);
      if (bytes <= targetBytes) { best = du; bestQ = q; lo = q; } else { hi = q; }
    }
    if (!best) best = cv.toDataURL(mime, 0.05);
    return { dataUrl: best, quality: bestQ };
  }

  async processImage(args) {
    const path = args.path;
    const { img, bytes } = await this._loadImage(path);
    // decide format
    const srcExt = extOf(path);
    let format = (args.format || '').toLowerCase();
    if (!format) { format = (srcExt === 'png' && !args.targetKB) ? 'png' : (srcExt === 'webp' ? 'webp' : 'jpeg'); }
    const mime = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
    const cv = this._renderToCanvas(img, { maxWidth: args.maxWidth, maxHeight: args.maxHeight, scale: args.scale, rotate: args.rotate, flip: args.flip, crop: args.crop, format: format });

    let dataUrl, qNote = '';
    if (args.targetKB && format !== 'png') {
      const r = this._compressToTarget(cv, mime, args.targetKB);
      dataUrl = r.dataUrl; qNote = ' (quality ' + Math.round(r.quality * 100) + ')';
    } else {
      const q = args.quality ? Math.min(100, Math.max(1, args.quality)) / 100 : 0.82;
      dataUrl = cv.toDataURL(mime, format === 'png' ? undefined : q);
      if (format !== 'png') qNote = ' (quality ' + Math.round(q * 100) + ')';
    }

    // output path
    let out = (args.out || '').trim();
    if (!out) { const dot = path.lastIndexOf('.'); const stem = dot < 0 ? path : path.slice(0, dot); out = stem + '-opt.' + (format === 'jpeg' ? 'jpg' : format); }
    const parts = out.split('/'); if (parts.length > 1) { const folder = parts.slice(0, -1).join('/'); if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder).catch(() => {}); }
    const buf = this._dataUrlToArrayBuffer(dataUrl);
    const existing = this.app.vault.getAbstractFileByPath(out);
    if (existing instanceof TFile) await this.app.vault.modifyBinary(existing, buf); else await this.app.vault.createBinary(out, buf);
    const newKB = (buf.byteLength / 1024).toFixed(1); const oldKB = (bytes / 1024).toFixed(1);
    const saved = bytes > 0 ? Math.round((1 - buf.byteLength / bytes) * 100) : 0;
    new Notice('Image saved: ' + out + ' (' + newKB + ' KB)');
    return 'Saved ' + out + qNote + '\nWas ' + oldKB + ' KB, now ' + newKB + ' KB' + (saved > 0 ? ' (' + saved + '% smaller)' : '') + '\nFinal dimensions ' + cv.width + ' x ' + cv.height + ' px\nEmbed with ![[' + out + ']]';
  }

  async batchProcessImages(args) {
    const folder = (args.folder || '').replace(/\/$/, '');
    const suffix = args.suffix || '-opt';
    const imgs = this.app.vault.getFiles().filter(f => ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(extOf(f.path)) && (!folder || f.path.startsWith(folder + '/')));
    if (!imgs.length) return 'No images found in ' + (folder || 'vault root');
    let done = 0, totOld = 0, totNew = 0; const lines = [];
    for (const f of imgs) {
      try {
        const dot = f.path.lastIndexOf('.'); const stem = dot < 0 ? f.path : f.path.slice(0, dot);
        const fmt = (args.format || '').toLowerCase();
        const ext = fmt ? (fmt === 'jpeg' ? 'jpg' : fmt) : (extOf(f.path) === 'jpeg' ? 'jpg' : extOf(f.path));
        const out = stem + suffix + '.' + ext;
        const r = await this.processImage({ path: f.path, out: out, targetKB: args.targetKB, maxWidth: args.maxWidth, maxHeight: args.maxHeight, scale: args.scale, format: args.format, quality: args.quality });
        done++;
        const mOld = r.match(/Was ([\d.]+) KB/); const mNew = r.match(/now ([\d.]+) KB/);
        if (mOld) totOld += parseFloat(mOld[1]); if (mNew) totNew += parseFloat(mNew[1]);
        lines.push('  ' + f.name + ' -> ' + out.split('/').pop());
      } catch (e) { lines.push('  ' + f.name + ' FAILED: ' + e.message); }
    }
    const pct = totOld > 0 ? Math.round((1 - totNew / totOld) * 100) : 0;
    return 'Processed ' + done + '/' + imgs.length + ' images.\nTotal ' + totOld.toFixed(0) + ' KB -> ' + totNew.toFixed(0) + ' KB (' + pct + '% smaller)\n' + lines.join('\n');
  }


  recordUsage(usage, model) {
    const s = this.settings;
    const promptTok = usage.prompt_tokens || 0;
    const outTok = usage.completion_tokens || 0;

    // OpenRouter: use fetched per-model pricing (price is per-token already).
    if (s.provider === 'openrouter') {
      const mid = model || s.orModel;
      // record recents (most-recent first, unique, max 8)
      if (mid) { s.orRecents = [mid, ...(s.orRecents || []).filter(x => x !== mid)].slice(0, 8); }
      const mdl = (s.orModels || []).find(m => m.id === mid);
      const cost = promptTok * (mdl ? mdl.inPrice : 0) + outTok * (mdl ? mdl.outPrice : 0);
      s.totalInTokens += promptTok; s.totalOutTokens += outTok; s.totalCost += cost;
      this.saveSettings(); this.refreshViews();
      return { cost: cost, tok: promptTok + outTok };
    }

    // DeepSeek splits input into cache-hit (cheap) and cache-miss (full price).
    let hit = usage.prompt_cache_hit_tokens;
    let miss = usage.prompt_cache_miss_tokens;
    if (hit == null && miss == null) { miss = promptTok; hit = 0; }       // older/other APIs: treat all as miss
    else { hit = hit || 0; miss = miss != null ? miss : Math.max(0, promptTok - hit); }
    const isPro = (model || '').includes('pro');
    const missRate = isPro ? s.priceProIn : s.priceFlashIn;
    const hitRate = isPro ? (s.priceProCache != null ? s.priceProCache : 0) : (s.priceFlashCache != null ? s.priceFlashCache : 0);
    const outRate = isPro ? s.priceProOut : s.priceFlashOut;
    const cost = (miss / 1e6) * missRate + (hit / 1e6) * hitRate + (outTok / 1e6) * outRate;
    s.totalInTokens += promptTok; s.totalOutTokens += outTok; s.totalCost += cost;
    this.saveSettings(); this.refreshViews();
    return { cost: cost, tok: promptTok + outTok };
  }
  persistSessions(sessions) { this.settings.persisted = sessions.map(s => ({ messages: (s.messages || []).map(m => m.images ? Object.assign({}, m, { images: undefined }) : m), reference: s.reference, draft: s.draft, model: s.model, attachments: (s.attachments || []).filter(a => !a.image), pinned: s.pinned || [], title: s.title || '', yolo: s.yolo, sessTok: s.sessTok || 0, sessCost: s.sessCost || 0 })); this.saveSettings(); }
  loadPersistedSessions() { const p = this.settings.persisted; if (!Array.isArray(p) || p.length !== SESSION_COUNT) return null; return p.map(s => ({ messages: s.messages || [], reference: !!s.reference, draft: s.draft || '', model: s.model || '', attachments: s.attachments || [], pinned: s.pinned || [], title: s.title || '', yolo: s.yolo == null ? null : s.yolo, sessTok: s.sessTok || 0, sessCost: s.sessCost || 0 })); }
  async activateView() { const { workspace } = this.app; const ex = workspace.getLeavesOfType(VIEW_TYPE_GAGE_CHAT); if (ex.length > 0) { workspace.revealLeaf(ex[0]); return; } const leaf = IS_MOBILE ? workspace.getLeaf(true) : workspace.getRightLeaf(false); await leaf.setViewState({ type: VIEW_TYPE_GAGE_CHAT, active: true }); workspace.revealLeaf(leaf); }
  refreshViews() { for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_GAGE_CHAT)) { const v = leaf.view; if (v && v.populateModelSelect) v.populateModelSelect(); if (v && v.refreshCost) v.refreshCost(); if (v && v.refreshMemBadge) v.refreshMemBadge(); if (v && v.refreshYoloBadge) v.refreshYoloBadge(); } }
  async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
  async saveSettings() { await this.saveData(this.settings); }
};

/* nosourcemap */
/* nosourcemap */