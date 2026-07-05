# Wiki Maintenance Rules

> **⚠️ CANONICAL RULE**: This wiki MUST be updated simultaneously with every release. No exceptions.

## The Rule

**Whenever a new version is released and CHANGELOG.md in the main repository is updated, this wiki MUST be updated within the same commit or immediately after.**

This is non-negotiable. Users rely on the wiki for accurate, up-to-date information about features, fixes, and usage.

## What to update

### On every release (minimum):

1. **Home.md**
   - Add a "New in X.X.X" section at the top
   - Summarize key changes in 1-2 sentences
   - Link to relevant pages for details

2. **Changelog.md**
   - Copy the new version section from CHANGELOG.md in the main repo
   - Ensure formatting matches the wiki style
   - Keep it in sync with the repository changelog

3. **Relevant feature pages**
   - Update any pages that document changed/added features
   - Add new sections for new features
   - Remove deprecated information

### When adding new features:

- Create new wiki pages if the feature warrants it
- Update the _Sidebar.md to include new pages
- Add cross-links between related pages

## Version coverage

The wiki should always document:
- ✅ The current latest version
- ✅ At least the previous 2-3 versions
- ✅ All major features since 1.0.0

If a version is missing from the wiki, it's a bug that needs fixing.

## Quality standards

1. **Accuracy first** — Information must be correct and verified
2. **Clarity** — Explain features simply and directly
3. **Completeness** — Cover all user-facing changes
4. **Consistency** — Use the same terminology as the plugin UI
5. **Timeliness** — Update within 24 hours of release

## Automation

Consider setting up:
- GitHub Actions to remind maintainers to update the wiki
- A pre-release checklist that includes wiki updates
- A script to sync changelog entries (while still allowing manual curation)

## How to update

### For maintainers:

```bash
# Clone the wiki repo
git clone https://github.com/saorgage/real-chat.wiki
cd real-chat.wiki

# Make your changes
# Update Home.md, Changelog.md, and relevant feature pages

# Commit and push
git add .
git commit -m "Update wiki for vX.X.X release"
git push origin master
```

### For contributors:

If you notice the wiki is outdated:
1. Check if there's already a PR or issue
2. Open an issue describing what's missing
3. Submit a PR with the updates (following the structure above)

## Enforcement

This rule is self-enforcing:
- Outdated wiki = confused users = more support requests = more work
- Up-to-date wiki = happy users = fewer questions = more time for development

**Everyone wins when the wiki is current.**

## History

This rule was established on 2026-06-25 after noticing the wiki was 4 days behind the latest release (v1.1.3). The gap caused user confusion about available features and fixes.

---

*Last updated: 2026-06-25*
