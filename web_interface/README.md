# Incognito Web

**Version 0.4.0** — standalone, **client-side** web interface for [Incognito](../README.md). One of two ways to anonymize qualitative text (alongside the desktop app). NER runs entirely in the browser — no Python, no Electron, no server.

**Live app:** [https://xiaoouwang.github.io/Incognito/](https://xiaoouwang.github.io/Incognito/)

> **Everything runs locally — your data never leaves your computer.**
> Your text is analyzed in the browser, not on a remote server. The only internet use is a one-time download of detection models; your documents are never uploaded.

## Two anonymization modes

Use the toggle at the top of the workflow:

| Mode | Engine | Best for |
| ---- | ------ | -------- |
| **Basic anonymization** (default) | CamemBERT (+ dates), BERT English, custom Hugging Face ONNX | People, places, organisations, dates in French qualitative text |
| **Advanced anonymization** (beta) | [GLiNER](https://github.com/urchade/GLiNER) multi-label NER | Finer protocols — health, diplomas, job titles, nationality, and other custom labels |

Both modes share the same review workflow:

1. **Detect** named entities in your text
2. **Review** the identified occurrences (toggle categories, exclude values, add/remove spans)
3. **Export** anonymized text, audit report, and Label Studio bundle

Replacements use **short stable placeholders**: three letters from the category + number — e.g. `[PER_1]`, `[PER_2]`, `[LOC_1]`, `[ORG_1]`, `[EMA_1]`, `[NAT_1]`.

This is an **anonymization assistant**, not a guarantee of full anonymization. Always read the output before sharing or archiving.

## Features

### Basic anonymization (CamemBERT)

- **ONNX NER** — French: CamemBERT + dates (default) or CamemBERT base; English: BERT NER; or any Hugging Face `token-classification` model with ONNX weights (custom)
- **Rule-based detection** — emails, URLs, dates, phone numbers (same patterns as the desktop app)
- **All occurrences** — each detected value is expanded to every matching occurrence in the document
- **Pre-loaded demo** — sample interview (Claire / Julien) with entities ready to explore (no model download on first open)

### Advanced anonymization (GLiNER)

- **Custom entity labels** — choose from 15 built-in types (person, organization, location, disease, diploma, nationality, …) or add categories manually during review
- **Regex-first contact details** — emails, URLs, and phone numbers are detected with regular expressions (preferred over GLiNER when spans overlap)
- **Chunked inference** — long texts are split into segments; progress reflects each segment
- **Pre-loaded demo** — Jean Dupont biography with example spans (explore labels without downloading the model)
- **Score threshold** — adjustable GLiNER confidence (default 0.2)

### Shared (both modes)

- **Three-column layout** — categories & entities · highlighted source · anonymized preview (scroll synced between highlight and preview)
- **Interactive review** — category toggles, per-value exclusion, manual span add/remove, custom categories
- **Audit report** — Markdown traceability with provenance (automatic vs manual)
- **Label Studio export** — pre-annotations JSON + labeling config XML
- **Batch processing** — choose a **whole folder** or **hand-picked files** (`.txt`, `.docx`); review each document; download a timestamped ZIP
- **Visible progress** — model download, GLiNER segment detection, batch loading, and batch detection
- **UI in English or French** — language toggle next to the title

## Quick start

```bash
cd web_interface
npm install
npm run dev
```

Open the URL shown in the terminal (typically http://127.0.0.1:5173).

The app opens in **Basic anonymization** with a pre-loaded sample demo. Switch to **Advanced anonymization** to explore GLiNER.

**First run on your own text:**

- **Basic** — CamemBERT ONNX downloads from Hugging Face (~100–400 MB depending on model) and is cached in the browser.
- **Advanced** — GLiNER ONNX (`model_q4f16.onnx`, ~472 MB) downloads once and is cached (browser Cache API + in-memory session).

Progress bars show download and detection status.

## Using the app

### Basic mode

1. Explore the **pre-loaded demo** or paste your own text.
2. Choose a **NER backend** (French CamemBERT + dates by default).
3. Click **Run Anonymization**.
4. Review categories and spans in the three-column panel.
5. Copy anonymized text, open the **audit report**, or **export to Label Studio**.

Key files: `src/lib/sampleDemo.js` · `src/components/CamembertWorkflowSection.jsx`

### Advanced mode

1. Select **entity labels** to detect (chips above the batch panel).
2. Paste text or use the **Jean Dupont** sample demo.
3. Click **Run GLiNER detection**.
4. Review highlights; manual additions use your **selected labels** as categories.
5. Export as in basic mode.

Key files: `src/lib/glinerRuntime.js` · `src/lib/glinerSampleDemo.js` · `src/components/GlinerWorkflowSection.jsx`

## Batch processing

1. **Choose folder** — load all supported `.txt` / `.docx` files in a directory (including subfolders).
2. **Choose files…** — pick specific documents without importing the whole folder.
3. Review each file (Previous / Next, jump by number or name).
4. **Download batch ZIP** when review is complete (`*-anonymized.txt`, `*-report.md`, `*-label-studio.json`).

Progress bars show **document loading** and **batch detection**. Word `.doc` (legacy format) is not supported — use `.docx`.

## Build for static hosting

```bash
npm run build
npm run preview
```

The `dist/` folder can be served by any static file host.

## Deploy to GitHub Pages

This repo includes [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml), which builds `web_interface/` and publishes `dist/` when you push to `main` **and** the commit touches `web_interface/` (or the workflow file itself).

1. **Commit and push** the `web_interface/` folder (and the workflow file) to GitHub.
2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source** → choose **GitHub Actions**.
3. After the first successful workflow run, the site is live at **https://xiaoouwang.github.io/Incognito/**

4. To redeploy without changing code: **Actions → Deploy web interface → Run workflow**.

`vite.config.js` uses `base: "./"` so asset paths work under the `/Incognito/` subpath.

## Desktop vs web

| Desktop (Electron)                | Web                                                           |
| --------------------------------- | ------------------------------------------------------------- |
| spaCy + CamemBERT (Python)        | CamemBERT + BERT NER ONNX (Transformers.js) + GLiNER (advanced) |
| Batch: folder of `.txt` on disk   | Batch: folder **or** selected `.txt` / `.docx` → ZIP download |
| Writes batch outputs to disk      | Downloads batch outputs as ZIP                                |
| Label Studio batch anonymization  | Not included (export only)                                    |
| Fully offline after model install | Requires network once per model for download                  |
| Installers (.dmg, .exe, AppImage) | Browser URL — no installer                                    |

## Stack

- React 19 + Vite
- `@huggingface/transformers` (ONNX in Web Worker) — basic mode
- `gliner` (ONNX Runtime WASM) — advanced mode
- [mammoth](https://www.npmjs.com/package/mammoth) — `.docx` text extraction
- JSZip for batch export

## License

Same as the parent project: [AGPLv3](../LICENSE).
