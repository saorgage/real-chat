# Memory and Triggers

## Persistent memory

Real Chat supports a **memory note** that is automatically included in every message to the model. This provides persistent context across sessions and conversations.

### Setup

1. Create a note in your vault (e.g., `Real Chat Memory.md`)
2. Go to **Settings → Real Chat → Memory**
3. Set the **Memory note path** to your memory note
4. Enable **Use memory**

### How it works

- The memory note content is prepended to every message as system context
- The model can read it but cannot modify it directly
- You can edit the memory note manually at any time
- Changes take effect on the next message

### Memory note format

Your memory note can contain:
- **Facts about you** — Your name, preferences, writing style
- **Project context** — What you're currently working on
- **Rules** — How the model should behave
- **Vault structure** — How your notes are organized

Example:
```markdown
# My Memory

## About me
- I am a software developer
- I prefer concise explanations
- I use TypeScript and React

## Current projects
- Working on a new Obsidian plugin
- Researching AI tools

## Rules
- Always provide code examples in TypeScript
- Explain concepts simply
- Ask clarifying questions if unsure
```

## Triggers

Triggers are custom commands that insert predefined text into your message when detected.

### Setup

1. Go to **Settings → Real Chat → Triggers**
2. Click **Add trigger**
3. Enter the **Trigger phrase** (what you type to activate it)
4. Enter the **Replacement text** (what gets inserted)

### Example triggers

| Trigger | Replacement | Purpose |
|---------|-------------|---------|
| `/today` | Today is {{date}} | Insert current date |
| `/greet` | Hello! How can I help you today? | Friendly greeting |
| `/code` | Please provide code examples in TypeScript | Language preference |

### Trigger syntax

- Triggers are case-sensitive by default
- Use `{{date}}` for current date
- Use `{{time}}` for current time
- Triggers fire when typed at the start of a line or after whitespace

### Advanced usage

Triggers can be used to:
- **Standardize prompts** — Ensure consistent formatting
- **Insert templates** — Quickly add common structures
- **Add metadata** — Automatically include context
- **Create shortcuts** — Reduce typing for common requests

## Memory + Triggers together

Combine memory and triggers for powerful workflows:

1. **Memory** provides persistent, read-only context
2. **Triggers** provide dynamic, insertable snippets
3. Together they create a customizable AI assistant

### Example workflow

Memory note:
```
I am writing a book about AI. Always use formal language.
```

Trigger:
- Trigger: `/chapter`
- Replacement: `In the current chapter about {{date}}, we are discussing: `

Result: When you type `/chapter`, it expands to include the date and your memory context guides the tone.

## Tips

1. **Start simple** — Begin with a few key facts in memory
2. **Iterate** — Refine your memory note over time
3. **Use triggers for repetition** — If you type the same thing often, make it a trigger
4. **Keep memory focused** — Too much context can overwhelm the model
5. **Review regularly** — Update your memory note as your needs change

## Limitations

- Memory note size counts toward your context token limit
- Triggers have a character limit (configurable in settings)
- Memory is read-only for the model (it cannot modify your memory note)
- Triggers fire before the message is sent, so they don't consume tokens
