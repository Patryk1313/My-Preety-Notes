# Aesthetic Notes — MVP v1

Local-run MVP that converts a `.docx` file into an aesthetic notebook-style HTML preview and PDF.

Quick start

1. Open a terminal in the project folder `aesthetic-notes`.
2. Install dependencies:

```bash
npm install
```

3. Build Sass to CSS (or run this automatically when developing):

```bash
npm run build:sass
```

4. Start the server (dev mode recommended):

```bash
npm run dev
```

5. Open http://localhost:3000 in your browser.

- Landing page: `http://localhost:3000` (marketing / home)
- Editor app: `http://localhost:3000/app.html` (upload and preview)

Notes on implementation

- Backend: Node.js + Express. Uses `multer` for uploads, `mammoth` to extract HTML from `.docx`, and `puppeteer` to render HTML → PDF.
- Frontend: simple HTML UI that uploads a `.docx`, shows a live preview (returned HTML), and generates a PDF from the preview.
- Styling: Sass source is in `src/scss/styles.scss`; compiled CSS is in `public/css/styles.css`.

New features added:

- Rich transformation rules: headings are converted to decorative headers, bold text becomes highlighted inline, lists get a hand-drawn style, and a decorative sticker is placed on the page.
- Project save/load: use the `Save Project` button in the UI to persist the current preview (name + theme). Saved projects appear in the `Saved Projects` list and can be reloaded into the preview.

Endpoints

- `POST /upload` — upload a `.docx` and receive transformed HTML (preview-ready)
- `POST /generate-pdf` — send `{"html": "<full html>"}` to receive a PDF
- `POST /save-project` — save JSON `{ name, html, theme }`
- `GET /projects` — list saved projects metadata
- `GET /project/:id` — load a saved project

Improvement suggestions for the formatting algorithm

- Map Word heading styles (Heading 1/2/3) from `mammoth` output to large decorative headers.
- Detect lists and convert bullets to handwritten-style bullet icons and spacing.
- Use heuristics: sentences ending with `:` or short uppercase lines -> section headers.
- Add token-based inline styling: lines starting with `-` or `*` → list items; `>>` → highlighted box.
- Support user metadata in the document (special markers) to control stickers, colors, or layout.
- Add a small rule-based doodle/sticker placer (randomized positions but deterministic per document hash).

Theme System

Themes are defined in `themes.json` (no code changes needed). To create a new theme:

1. Open `themes.json`
2. Add a new entry under `"themes"`:

```json
{
  "myTheme": {
    "name": "Theme Display Name",
    "description": "Brief description",
    "colors": {
      "background": "#fffaf6",
      "headerText": "#ff9fb0",
      "decorHeader": "#ff7fa0",
      "sticker": "#ffd6e0",
      "accent": "#ffb86b",
      "bodyBg": "linear-gradient(180deg, #f6f3ef 0%, #fff 100%)"
    },
    "fonts": {
      "header": "'Pacifico', cursive",
      "body": "'Patrick Hand', system-ui, sans-serif"
    }
  }
}
```

3. Reload the app — your theme will appear in the Theme selector.

Known caveats

- Puppeteer downloads Chromium (large) during `npm install`; CI or headless environments may need extra setup.
- This is an MVP. For production, sanitize inputs, set size limits, and manage temporary files.
