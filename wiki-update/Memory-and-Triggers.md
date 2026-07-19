# Memory & Triggers

## Persistent memory
Real Chat reads a **memory note** on every message, so facts you want it to always know stay in context across sessions and restarts. The path is set in Settings (it's shown in the in-app help, e.g. a file under `_memory`).

- Say **"remember this: …"** and the model appends it to the memory note.
- Edit the memory note directly any time to add, change or prune facts.
- Memory counts toward your context budget — the **ctx ~Xk** indicator includes it. If it grows large, trim it (see **[Usage → Context](Usage#context--what-the-model-sees)**).

## Triggers — your own commands
Inside the memory note, add a `## Triggers` section with natural-language commands. Each trigger maps a phrase to an action. For example:

```markdown
## Triggers
- **add book**: when I say "add book <title>", append "- <title>" to "Reading/Reading list.md".
```

Then typing:

```
add book Dune
```

…runs that instruction — here, appending `- Dune` to your reading list. Triggers are just instructions the model follows, so they can do anything the model's tools allow (append, create, edit, search, etc.).

## Tips
- Keep triggers short and unambiguous; name the exact target file in quotes.
- Use memory for durable preferences ("always answer concisely", "my projects live in `Work/`") and triggers for repeatable actions.
- Because triggers can edit files, consider leaving **[YOLO mode](Usage#yolo-mode)** off so you confirm changes — or on, if you trust your triggers and want them instant.