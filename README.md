# Anonymizer for Digital Humanities (still thinking about the name)

Qualitative Text Anonymizer is a local-first desktop prototype for helping social sciences researchers review and anonymize sensitive information in pasted qualitative text.

It is designed for interview excerpts, field notes, open-ended survey responses, and similar research materials. It is an anonymization assistant, not a guarantee of complete anonymity.

## Main Functions

![screenshot](demo.gif)

- Run local named entity recognition using spaCy (small or large) or CamemBERT (development mode).
- Highlight detected entities in the text.
- Review detected categories such as people, locations, organizations, dates, emails, phone numbers, URLs, and miscellaneous entities.
- Choose which entity categories should be replaced.
- Preview the anonymized text with placeholders such as `[PERSON_1]`, `[LOCATION_1]`, `[DATE_1]`, and `[EMAIL_1]`.
- Generate an **audit report** showing replacement decisions, including the exact values reviewed/replaced.

## Bundled NER Service

The macOS release includes a bundled Python/spaCy NER service built with PyInstaller.

Users of the released macOS app do not need to install Python, spaCy, or the French spaCy model separately. The app runs the bundled local NER service from inside the application package.

No text is sent to an external API by default.

## Warm-Up Time

The first NER run may take several seconds because the bundled spaCy model has to warm up.

After startup, the app keeps a persistent local NER service running in the background, so later detections should be faster. If the first detection feels slow, wait for the app to finish loading the model.

## Prototype Status

This is a research prototype.

- The app does not guarantee complete anonymization.
- Researchers should manually review the anonymized output for missed identifiers and indirect re-identification risks.
- The current packaged release is macOS only.
- The packaged release bundles the French spaCy small model (`fr_core_news_sm`). In development you can choose small, large, or CamemBERT.

## Releases

Only the macOS release is currently published.

Download the packaged app from GitHub Releases:

- `Qualitative Text Anonymizer-0.1.0-arm64.dmg`
- `Qualitative Text Anonymizer-0.1.0-arm64-mac.zip`

The repository should contain source code only. Generated folders such as `node_modules/`, `.venv/`, `dist/`, `release/`, `python-build/`, and `python-dist/` should not be committed.

## Development

Install JavaScript dependencies:

```bash
npm install
```

Create the local Python environment for development.

Use **Python 3.12** — PyTorch (required for the CamemBERT backend) does not publish wheels for Python 3.13 yet.

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m spacy download fr_core_news_sm
.venv/bin/python -m spacy download fr_core_news_lg
```

For the optional CamemBERT NER backend, also install (pins `transformers` 4.x for compatibility with the available PyTorch build):

```bash
.venv/bin/pip install -r requirements-camembert.txt
```

The first CamemBERT run downloads `Jean-Baptiste/camembert-ner` from Hugging Face (~400 MB). Restart the app after installing CamemBERT dependencies so the NER service reloads.

Run the app in development mode:

```bash
npm run dev
```

## Build The macOS App

Build the bundled NER executable:

```bash
npm run build:ner
```

Build the macOS DMG and ZIP:

```bash
npm run dist:mac
```

Generated release files are written to:

```bash
release/
```

## Export to Label Studio

After running NER, use **Export to Label Studio** to download:

- `label-studio-ner-YYYY-MM-DD.json` — one task with `predictions` (pre-annotations) for span labeling
- `label-studio-ner-config.xml` — paste into **Settings → Labeling Interface** when creating the project

In Label Studio:

1. Create a project and paste the XML labeling config.
2. **Import** the JSON file (Upload Files).
3. Open tasks — detected spans appear as pre-annotations to accept, edit, or extend.

Export opens a save dialog for the JSON file and writes `label-studio-ner-config.xml` in the same folder.

Entity labels map to: Person, Location, Organization, Date, Email, Phone, URL, Misc.

## Anonymization report from Label Studio export

After refining annotations in Label Studio, export the project as JSON and run:

```bash
.venv/bin/python scripts/anonymization_report.py path/to/export.json -o anonymization-report.md --anonymized anonymized.txt
```

Options:

- `--include Person,Location` — replace only these categories
- `--exclude Misc` — keep a category unchanged
- `--task-id 1` — process a single task from a multi-task export

The script reads finalized `annotations` (falling back to `predictions` if needed) and writes a markdown audit report plus optional anonymized text using placeholders such as `[PERSON_1]`, `[LOCATION_1]`.

In the app, use **Batch from Label Studio** to pick an input folder of JSON exports and an output folder. Each task produces `*-report.md` and `*-anonymized.txt`, plus `batch-summary.json`.

## Batch text folder

Use the **Batch text folder** panel in the app to process every `.txt`, `.md`, or `.text` file in a directory:

1. Choose which entity categories to anonymize.
2. Select the NER backend in the toolbar.
3. Click **Process text folder** and choose input/output directories.

Output per source file (`.txt` / `.text` only):

- `{name}-anonymized.txt`
- `{name}-report.md`
- `{name}-label-studio.json`

Use a **separate output folder** from your source texts. If you pick the same folder, results go to `anonymized-results/` automatically. Prior output files (`*-anonymized.txt`, `*-report.md`) are never re-processed as input.

Command line:

```bash
.venv/bin/python scripts/batch_anonymize_texts.py \
  --input-dir ./texts \
  --output-dir ./output \
  --backend spacy-lg \
  --categories person,location,organization,email
```

## Privacy Note

The app is intended for local processing. However, audit reports can include exact detected values when configured that way, so treat exported reports as sensitive research data.
