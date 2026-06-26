# Incognito Web

**Version 0.3.0** — standalone, **client-side** web interface for [Incognito](../README.md). One of two ways to anonymize qualitative text (alongside the desktop app). NER runs entirely in the browser via [Transformers.js](https://huggingface.co/docs/transformers.js) and ONNX Runtime WASM — no Python, no Electron, no server.

**Live app:** [https://xiaoouwang.github.io/Incognito/](https://xiaoouwang.github.io/Incognito/)

> **Everything runs locally — your data never leaves your computer.**
> Your text is analyzed in the browser, not on a remote server. The only internet use is a one-time download of the detection model; your documents are never uploaded.

## What “basic anonymization” means (v0.3.0)

Incognito **0.3.0** stabilizes a straightforward workflow for qualitative researchers:

1. **Detect** people, places, organisations, dates, emails, etc.
2. **Review** — toggle categories, exclude specific values, add or remove spans.
3. **Replace** with stable numbered placeholders:
   - first distinct person → `[PERSON_1]`, second → `[PERSON_2]`, …
   - same pattern for locations (`[LOCATION_1]`), organisations (`[ORG_1]`), dates, emails, …

This is **basic anonymization** — consistent relabelling, not a guarantee of full anonymization. Always read the output before sharing or archiving.

## Features

- **ONNX NER** — French: CamemBERT + dates (default) or CamemBERT base; English: BERT NER; or any Hugging Face `token-classification` model with ONNX weights (custom)
- **Rule-based detection** — emails, URLs, dates, phone numbers (same patterns as the desktop app)
- **All occurrences** — each detected name/place is expanded to every matching occurrence in the document
- **Pre-loaded demo** — sample interview with entities ready to explore (no model download required on first open)
- **Interactive review** — category toggles, per-value exclusion, manual span add/remove, custom categories
- **Audit report** — Markdown traceability with provenance (automatic vs manual)
- **Label Studio export** — pre-annotations JSON + labeling config XML
- **Batch processing** — choose a **whole folder** or **hand-picked files** (`.txt`, `.docx`); review each document; download a timestamped ZIP
- **Visible progress** — progress bars for model download, batch loading, and batch anonymization
- **UI in English or French** — language toggle next to the title (category names and audit report body stay in English)

## Quick start

```bash
cd web_interface
npm install
npm run dev
```

Open the URL shown in the terminal (typically http://127.0.0.1:5173).

The app opens with a **pre-loaded sample demo**: a French interview excerpt (Claire / Julien) with entities already detected. Explore category toggles, exclusions, and manual edits immediately. Click **Run Anonymization** on your own text when ready.

**First run:** the selected ONNX model downloads from Hugging Face (~100–400 MB depending on model) and is cached in the browser. A **progress bar** shows the download status.

## Using the app

1. On first open, explore the **pre-loaded demo** in the review panel (no model required).
2. Paste or edit text, or load documents in **batch mode**.
3. Choose a **NER model** (French CamemBERT + dates by default).
4. Click **Run Anonymization** — detection runs locally in a Web Worker.
5. Review categories and spans; each unique person becomes `[PERSON_1]`, `[PERSON_2]`, etc. when exported.
6. Copy anonymized text, open the **audit report**, or **export to Label Studio**.

Precomputed demo data: `src/lib/sampleDemo.js` · detection post-processing: `src/lib/entityUtils.js` (`finalizeDetectedEntities`).

## Batch processing

1. **Choose folder** — load all supported `.txt` / `.docx` files in a directory (including subfolders).
2. **Choose files…** — pick specific documents without importing the whole folder.
3. Review each file (Previous / Next, jump by number or name on the same row).
4. **Download batch ZIP** when review is complete (`*-anonymized.txt`, `*-report.md`, `*-label-studio.json`).

Progress bars show **document loading** and **batch detection** with completed-file counting. Word `.doc` (legacy format) is not supported — use `.docx`.

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
| spaCy + CamemBERT (Python)        | CamemBERT + BERT NER ONNX (Transformers.js)                   |
| Batch: folder of `.txt` on disk   | Batch: folder **or** selected `.txt` / `.docx` → ZIP download |
| Writes batch outputs to disk      | Downloads batch outputs as ZIP                                |
| Label Studio batch anonymization  | Not included (export only)                                    |
| Fully offline after model install | Requires network once per model for download                  |
| Installers (.dmg, .exe, AppImage) | Browser URL — no installer                                    |

## Stack

- React 19 + Vite
- `@huggingface/transformers` (ONNX in Web Worker)
- [mammoth](https://www.npmjs.com/package/mammoth) — `.docx` text extraction
- JSZip for batch export

## License

Same as the parent project: [AGPLv3](../LICENSE).
