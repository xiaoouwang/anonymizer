#!/usr/bin/env python3
"""Generate anonymization reports from Label Studio NER exports."""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

LABEL_STUDIO_TO_PREFIX = {
    "Person": "PERSON",
    "Location": "LOCATION",
    "Organization": "ORG",
    "Date": "DATE",
    "Email": "EMAIL",
    "Phone": "PHONE",
    "URL": "URL",
    "Misc": "ENTITY",
}

LABEL_STUDIO_TO_DISPLAY = {
    "Person": "People",
    "Location": "Locations",
    "Organization": "Organizations",
    "Date": "Dates",
    "Email": "Emails",
    "Phone": "Phone numbers",
    "URL": "URLs",
    "Misc": "Other entities",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build an anonymization audit report (and optional anonymized text) "
            "from a Label Studio JSON export."
        )
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        help="Label Studio export JSON file (tasks with annotations or predictions).",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        help="Directory of Label Studio JSON exports to process in batch.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Output directory for batch reports and anonymized text files.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Write the markdown report to this file (default: stdout).",
    )
    parser.add_argument(
        "--anonymized",
        type=Path,
        help="Also write anonymized text for each task to this file or directory.",
    )
    parser.add_argument(
        "--task-id",
        type=int,
        help="Only process the task with this Label Studio id.",
    )
    parser.add_argument(
        "--include",
        help="Comma-separated label categories to replace (default: all detected).",
    )
    parser.add_argument(
        "--exclude",
        help="Comma-separated label categories to keep unchanged.",
    )
    return parser.parse_args()


def load_tasks(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and "tasks" in payload:
        return payload["tasks"]
    raise ValueError("Expected a JSON array of Label Studio tasks.")


def parse_category_list(value: str | None) -> set[str] | None:
    if not value:
        return None
    return {item.strip() for item in value.split(",") if item.strip()}


def extract_spans(task: dict[str, Any]) -> tuple[str, list[dict[str, Any]], str | None]:
    data = task.get("data") or {}
    text = data.get("text", "")
    if not isinstance(text, str):
        raise ValueError(f"Task {task.get('id')} is missing data.text.")

    results = pick_annotation_results(task)
    model_name = data.get("ner_model") or data.get("ner_backend")

    spans = []
    for item in results:
        if item.get("type") != "labels":
            continue

        value = item.get("value") or {}
        labels = value.get("labels") or []
        if not labels:
            continue

        start = value.get("start")
        end = value.get("end")
        span_text = value.get("text") or ""

        if not isinstance(start, int) or not isinstance(end, int) or start >= end:
            continue

        if not span_text and text:
            span_text = text[start:end]

        spans.append(
            {
                "start": start,
                "end": end,
                "text": span_text,
                "label": labels[0],
                "origin": item.get("origin", "unknown"),
            }
        )

    spans.sort(key=lambda span: (span["start"], span["end"]))
    return text, spans, model_name


def pick_annotation_results(task: dict[str, Any]) -> list[dict[str, Any]]:
    annotations = task.get("annotations") or []
    completed = [item for item in annotations if not item.get("was_cancelled")]
    if completed:
        return completed[-1].get("result") or []

    predictions = task.get("predictions") or []
    if predictions and isinstance(predictions[0], dict):
        return predictions[0].get("result") or []

    prediction_ids = task.get("predictions") or []
    if prediction_ids and not isinstance(prediction_ids[0], dict):
        nested = (completed[0].get("prediction") if completed else None) or {}
        if nested.get("result"):
            return nested["result"]

    return []


def group_unique_spans(spans: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen: dict[str, set[str]] = defaultdict(set)

    for span in spans:
        label = span["label"]
        key = span["text"].casefold()
        if key in seen[label]:
            continue
        seen[label].add(key)
        grouped[label].append(span)

    return dict(grouped)


def count_occurrences(text: str, value: str) -> int:
    count = 0
    cursor = 0
    while cursor < len(text):
        index = text.find(value, cursor)
        if index == -1:
            break
        count += 1
        cursor = index + len(value)
    return count


def build_replacement_map(
    grouped: dict[str, list[dict[str, Any]]],
    selected_labels: set[str],
) -> dict[tuple[str, str], str]:
    replacements: dict[tuple[str, str], str] = {}

    for label in sorted(grouped):
        if label not in selected_labels:
            continue
        prefix = LABEL_STUDIO_TO_PREFIX.get(label, "ENTITY")
        for index, span in enumerate(grouped[label], start=1):
            replacements[(label, span["text"])] = f"[{prefix}_{index}]"

    return replacements


def anonymize_text(
    text: str,
    spans: list[dict[str, Any]],
    replacements: dict[tuple[str, str], str],
    selected_labels: set[str],
) -> str:
    applicable = [
        span
        for span in spans
        if span["label"] in selected_labels and (span["label"], span["text"]) in replacements
    ]
    output = text
    for span in sorted(applicable, key=lambda item: item["start"], reverse=True):
        placeholder = replacements[(span["label"], span["text"])]
        output = output[: span["start"]] + placeholder + output[span["end"] :]
    return output


def resolve_selected_labels(
    grouped: dict[str, list[dict[str, Any]]],
    include: set[str] | None,
    exclude: set[str] | None,
) -> set[str]:
    labels = set(grouped)
    if include is not None:
        labels &= include
    if exclude:
        labels -= exclude
    return labels


def create_report(
    *,
    task_id: int | str | None,
    text: str,
    spans: list[dict[str, Any]],
    grouped: dict[str, list[dict[str, Any]]],
    selected_labels: set[str],
    anonymized_text: str,
    model_name: str | None,
    source_file: Path,
) -> str:
    categories = sorted(grouped)
    selected = sorted(label for label in categories if label in selected_labels)
    kept = sorted(label for label in categories if label not in selected_labels)

    category_lines = []
    for label in categories:
        unique_count = len(grouped[label])
        occurrence_count = sum(count_occurrences(text, span["text"]) for span in grouped[label])
        status = "replaced" if label in selected_labels else "kept unchanged"
        display = LABEL_STUDIO_TO_DISPLAY.get(label, label)
        category_lines.append(
            f"- {display}: {unique_count} unique value(s), "
            f"{occurrence_count} occurrence(s), {status}"
        )

    replacement_lines = []
    replacements = build_replacement_map(grouped, selected_labels)
    for label in selected:
        display = LABEL_STUDIO_TO_DISPLAY.get(label, label)
        for span in grouped[label]:
            placeholder = replacements[(label, span["text"])]
            occurrences = count_occurrences(text, span["text"])
            plural = "" if occurrences == 1 else "s"
            replacement_lines.append(
                f'- {display}: "{span["text"]}" -> {placeholder} '
                f"({occurrences} occurrence{plural}, origin: {span.get('origin', 'unknown')})"
            )

    generated = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    task_line = f"- Task id: {task_id}\n" if task_id is not None else ""

    return f"""# Anonymization Audit Report

Generated: {generated}
Tool: Label Studio anonymization report script
Source file: {source_file.name}
NER engine: {model_name or "Not specified"}
{task_line}
## Document Summary
- Source characters: {len(text)}
- Anonymized characters: {len(anonymized_text)}
- Entity spans annotated: {len(spans)}
- Entity categories detected: {len(categories)}
- Categories selected for replacement: {len(selected)}
- Categories kept unchanged: {len(kept)}

## Category Decisions
{chr(10).join(category_lines) if category_lines else "- No entities detected"}

## Exact Values Replaced
{chr(10).join(replacement_lines) if replacement_lines else "- No values selected for replacement"}

## Replacement Method
Selected entity categories were replaced with stable category placeholders, for example [PERSON_1], [LOCATION_1], [DATE_1], and [EMAIL_1]. Span-based replacement is applied from the annotated offsets; repeated values share the same placeholder.

## Categories Replaced
{chr(10).join(f"- {LABEL_STUDIO_TO_DISPLAY.get(label, label)}" for label in selected) or "- None"}

## Categories Kept Unchanged
{chr(10).join(f"- {LABEL_STUDIO_TO_DISPLAY.get(label, label)}" for label in kept) or "- None"}

## Privacy Note
This report includes raw detected values selected for replacement so the anonymization process can be audited. Treat the report as sensitive research data and store or share it with the same care as the source document.

## Research Caveat
This tool is an anonymization assistant. Researchers should manually review the anonymized text for indirect identifiers, rare contextual details, and annotation errors before sharing or archiving data.
"""


def write_anonymized_output(path: Path, task_id: int | str | None, text: str) -> None:
    if path.suffix:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return

    path.mkdir(parents=True, exist_ok=True)
    suffix = f"-task-{task_id}" if task_id is not None else ""
    output_file = path / f"anonymized{suffix}.txt"
    output_file.write_text(text, encoding="utf-8")


def process_task(
    task: dict[str, Any],
    *,
    source_file: Path,
    include: set[str] | None,
    exclude: set[str] | None,
) -> tuple[str, str]:
    text, spans, model_name = extract_spans(task)
    grouped = group_unique_spans(spans)
    selected_labels = resolve_selected_labels(grouped, include, exclude)
    replacements = build_replacement_map(grouped, selected_labels)
    anonymized_text = anonymize_text(text, spans, replacements, selected_labels)

    return create_report(
        task_id=task.get("id"),
        text=text,
        spans=spans,
        grouped=grouped,
        selected_labels=selected_labels,
        anonymized_text=anonymized_text,
        model_name=model_name,
        source_file=source_file,
    ), anonymized_text


def output_paths(output_dir: Path, source_file: Path, task_id: int | str | None) -> tuple[Path, Path]:
    stem = source_file.stem
    suffix = f"-task-{task_id}" if task_id is not None else ""
    return (
        output_dir / f"{stem}{suffix}-report.md",
        output_dir / f"{stem}{suffix}-anonymized.txt",
    )


def process_export_file(
    input_path: Path,
    output_dir: Path,
    *,
    include: set[str] | None = None,
    exclude: set[str] | None = None,
    task_id: int | None = None,
) -> list[dict[str, Any]]:
    tasks = load_tasks(input_path)
    if task_id is not None:
        tasks = [task for task in tasks if task.get("id") == task_id]
        if not tasks:
            raise ValueError(f"No task found with id {task_id} in {input_path.name}.")

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []

    for task in tasks:
        report, anonymized_text = process_task(
            task,
            source_file=input_path,
            include=include,
            exclude=exclude,
        )
        _, spans, _ = extract_spans(task)
        report_path, anonymized_path = output_paths(output_dir, input_path, task.get("id"))
        report_path.write_text(report, encoding="utf-8")
        anonymized_path.write_text(anonymized_text, encoding="utf-8")
        results.append(
            {
                "source_file": input_path.name,
                "task_id": task.get("id"),
                "report_path": str(report_path),
                "anonymized_path": str(anonymized_path),
                "span_count": len(spans),
            }
        )

    return results


def process_export_directory(
    input_dir: Path,
    output_dir: Path,
    *,
    include: set[str] | None = None,
    exclude: set[str] | None = None,
) -> dict[str, Any]:
    if not input_dir.is_dir():
        raise ValueError(f"Input directory does not exist: {input_dir}")

    json_files = sorted(input_dir.glob("*.json"))
    if not json_files:
        raise ValueError(f"No JSON files found in {input_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for json_file in json_files:
        try:
            results.extend(
                process_export_file(
                    json_file,
                    output_dir,
                    include=include,
                    exclude=exclude,
                )
            )
        except Exception as error:
            errors.append({"file": json_file.name, "error": str(error)})

    summary = {
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "json_files": len(json_files),
        "tasks_processed": len(results),
        "results": results,
        "errors": errors,
    }
    summary_path = output_dir / "batch-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    summary["summary_path"] = str(summary_path)
    return summary


def main() -> int:
    args = parse_args()
    include = parse_category_list(args.include)
    exclude = parse_category_list(args.exclude)

    if args.input_dir:
        if not args.output_dir:
            print("Batch mode requires --output-dir.", file=sys.stderr)
            return 1
        summary = process_export_directory(
            args.input_dir,
            args.output_dir,
            include=include,
            exclude=exclude,
        )
        if summary["errors"] and not summary["tasks_processed"]:
            print(json.dumps(summary, indent=2), file=sys.stderr)
            return 1
        print(json.dumps(summary, indent=2))
        return 0

    if not args.input:
        print("Provide an input JSON file or use --input-dir.", file=sys.stderr)
        return 1

    if args.output_dir:
        results = process_export_file(
            args.input,
            args.output_dir,
            include=include,
            exclude=exclude,
            task_id=args.task_id,
        )
        print(json.dumps({"tasks_processed": len(results), "results": results}, indent=2))
        return 0

    tasks = load_tasks(args.input)

    if args.task_id is not None:
        tasks = [task for task in tasks if task.get("id") == args.task_id]
        if not tasks:
            print(f"No task found with id {args.task_id}.", file=sys.stderr)
            return 1

    reports = []
    for task in tasks:
        report, anonymized_text = process_task(
            task,
            source_file=args.input,
            include=include,
            exclude=exclude,
        )
        reports.append(report)

        if args.anonymized:
            write_anonymized_output(args.anonymized, task.get("id"), anonymized_text)

    combined = "\n\n---\n\n".join(reports)

    if args.output:
        args.output.write_text(combined, encoding="utf-8")
    else:
        print(combined)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
