# GitHub Pages — legal documents

This folder is published as the public site for Privacy Policy and Terms of Service.

## Enable GitHub Pages

1. Push this repo (including `docs/`) to GitHub.
2. Repo → **Settings** → **Pages**.
3. **Source**: Deploy from a branch.
4. Branch: `main` (or `master`), folder: `/docs`.
5. Save. After a minute the site is live at:

   - https://nima-mehr.github.io/Kryptix/
   - https://nima-mehr.github.io/Kryptix/privacy/
   - https://nima-mehr.github.io/Kryptix/terms/

Use the **privacy** URL in App Store Connect and Google Play Console.

## Files

| Path | Purpose |
|------|---------|
| `index.html` | Legal home / landing |
| `privacy/index.html` | Privacy Policy (HTML) |
| `terms/index.html` | Terms of Service (HTML) |
| `styles.css` | Shared dark theme styles |

Markdown sources (for the repo) live at the project root:

- `PRIVACY_POLICY.md`
- `TERMS_OF_SERVICE.md`

Keep HTML and Markdown in sync when you edit the policies.
