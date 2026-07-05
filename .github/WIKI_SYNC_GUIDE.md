# Wiki Sync Guide

## Important: Always Update the Wiki Folder

**RULE:** When making any documentation changes to this repository, you MUST update the files in the `/wiki/` folder instead of editing the GitHub wiki directly.

## Why This Matters

- GitHub wikis are separate git repositories (`.wiki.git`) that cannot be accessed via the GitHub API
- The only way to update wiki content is through direct git operations against the wiki repo URL
- This repository uses a GitHub Actions workflow to automatically sync the `/wiki/` folder to the actual wiki

## How It Works

1. **Edit files in `/wiki/`** - Add, modify, or delete markdown files in this folder
2. **Commit and push** - The workflow triggers automatically on changes to `wiki/**` paths
3. **Automatic sync** - GitHub Actions pushes changes to `saorgage/real-chat.wiki.git`
4. **Wiki updates** - The GitHub wiki is automatically updated within minutes

## Files to Maintain

The following files should be kept in sync:
- `wiki/Home.md` - Main wiki homepage
- `wiki/Setup.md` - Installation and setup guide
- `wiki/Usage.md` - Usage instructions and features
- `wiki/Vision-and-Images.md` - Vision and image handling
- `wiki/Tools-and-Vault-Actions.md` - Available tools and vault operations
- `wiki/Memory-and-Triggers.md` - Memory and custom triggers
- `wiki/_Sidebar.md` - Wiki sidebar navigation

## Verification Checklist

Before merging any PR that affects documentation:
- [ ] All wiki content changes are made in the `/wiki/` folder
- [ ] No direct edits to the GitHub wiki (`.wiki.git`) repository
- [ ] The workflow file `.github/workflows/wiki-sync.yml` is unchanged (unless intentionally modifying the sync process)
- [ ] Test by checking that the workflow runs successfully after merge

## Emergency Recovery

If the wiki ever gets out of sync:
1. Clone the wiki repo: `git clone https://github.com/saorgage/real-chat.wiki.git`
2. Copy all `.md` files from the wiki repo to `/wiki/` in this repository
3. Commit and push to trigger the sync workflow
4. The wiki will be restored to match the `/wiki/` folder content

## Workflow Details

The sync is handled by `.github/workflows/wiki-sync.yml` using the `Andrew-Chen-Wang/github-wiki-action@v4` action. This runs automatically on any push that affects files in the `wiki/` directory.