# PrivacyWriter — Local Website

Quick commands to serve the static `website/` folder locally for development.

Options:
- npm / npx (recommended):

```bash
cd website
npx serve . -l 5000
# open http://localhost:5000
```

- Python (no install):

```bash
cd website
python -m http.server 5000 --directory .
# open http://localhost:5000
```

Notes:
- The project uses a small shared `styles.css` (extension color palette) across pages.
- Use `npx` so you don't need to install global tools.
