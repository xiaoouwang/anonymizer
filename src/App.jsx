import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createLabelStudioExport,
  LABEL_STUDIO_NER_CONFIG,
} from "./labelStudioExport.js";

const SAMPLE_TEXT = `Extrait d'entretien :

La docteure Marie Dupont a rencontré Jean Martin à Paris le 12 mars 2022.
Marie travaille avec l'Université de Lyon. Son email est marie.dupont@example.com.
La participante a aussi mentionné +33 6 12 34 56 78 et https://example.org/project.

Marie vient d'effectuer un stage de 3 mois à Paris, Hôpital Saint-Louis.`;

const CATEGORY_LABELS = {
  person: "People",
  location: "Locations",
  organization: "Organizations",
  date: "Dates",
  email: "Emails",
  phone: "Phone numbers",
  url: "URLs",
  misc: "Other entities",
};

const CATEGORY_PREFIXES = {
  person: "PERSON",
  location: "LOCATION",
  organization: "ORG",
  date: "DATE",
  email: "EMAIL",
  phone: "PHONE",
  url: "URL",
  misc: "ENTITY",
};

const NER_BACKENDS = {
  "spacy-sm": "spaCy French small (fr_core_news_sm)",
  "spacy-lg": "spaCy French large (fr_core_news_lg)",
  camembert: "CamemBERT NER (Jean-Baptiste/camembert-ner)",
};

const BUILTIN_CATEGORY_IDS = new Set(Object.keys(CATEGORY_LABELS));

function slugifyCategoryId(name) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return slug || "custom";
}

function formatCategoryDisplayName(categoryId) {
  return categoryId
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryPrefixFromLabel(label) {
  const prefix = label
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return prefix || "CUSTOM";
}

function createCustomCategoryId(displayName, customCategories) {
  let baseId = slugifyCategoryId(displayName);
  if (!CATEGORY_LABELS[baseId] && !customCategories[baseId]) {
    return baseId;
  }

  let suffix = 2;
  while (CATEGORY_LABELS[`${baseId}_${suffix}`] || customCategories[`${baseId}_${suffix}`]) {
    suffix += 1;
  }

  return `${baseId}_${suffix}`;
}

function inferCustomCategoriesFromEntities(entities, customCategories = {}) {
  const inferred = { ...customCategories };

  entities.forEach((entity) => {
    const categoryId = entity.label;
    if (categoryId && !CATEGORY_LABELS[categoryId] && !inferred[categoryId]) {
      inferred[categoryId] = formatCategoryDisplayName(categoryId);
    }
  });

  return inferred;
}

function buildCategoryLabels(customCategories) {
  return { ...CATEGORY_LABELS, ...customCategories };
}

function buildMenuCategories(customCategories) {
  return [
    ...Object.entries(CATEGORY_LABELS),
    ...Object.entries(customCategories)
      .filter(([categoryId]) => !CATEGORY_LABELS[categoryId])
      .sort(([, left], [, right]) => left.localeCompare(right)),
  ];
}

function getCategoryLabel(categoryId, customCategories) {
  return buildCategoryLabels(customCategories)[categoryId] || categoryId;
}

function getCategoryPrefix(categoryId, customCategories) {
  if (CATEGORY_PREFIXES[categoryId]) {
    return CATEGORY_PREFIXES[categoryId];
  }

  return categoryPrefixFromLabel(getCategoryLabel(categoryId, customCategories));
}

function getCategoryChipClass(categoryId) {
  return BUILTIN_CATEGORY_IDS.has(categoryId) ? `chip-${categoryId}` : "chip-custom";
}

function getCategoryHighlightClass(categoryId) {
  return BUILTIN_CATEGORY_IDS.has(categoryId) ? `highlight-${categoryId}` : "highlight-custom";
}

function isManualEntity(entity) {
  return entity?.source === "manual";
}

function formatProvenanceLabel(source) {
  if (!source || source === "manual") {
    return "Human manual review";
  }

  if (source === "rule") {
    return "Automatic detection (rule-based pattern)";
  }

  return `Automatic detection (${source})`;
}

function getSpansForValue(entities, category, value) {
  const normalized = value.toLocaleLowerCase();
  return entities.filter(
    (entity) =>
      entity.label === category && entity.text.toLocaleLowerCase() === normalized,
  );
}

function summarizeSpanProvenance(entities, category, value) {
  const spans = getSpansForValue(entities, category, value);
  const manualSpans = spans.filter(isManualEntity);
  const machineSpans = spans.filter((entity) => !isManualEntity(entity));
  const machineBySource = machineSpans.reduce((counts, entity) => {
    const key = entity.source || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  return {
    spans,
    manualSpans,
    machineSpans,
    machineBySource,
  };
}

function formatSpanProvenanceDetail(provenance) {
  const parts = Object.entries(provenance.machineBySource)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, count]) => `${count} automatic (${source})`);

  if (provenance.manualSpans.length) {
    parts.push(`${provenance.manualSpans.length} manual`);
  }

  return parts.join(", ") || "unknown";
}

function summarizeDocumentProvenance(entities) {
  const manualSpans = entities.filter(isManualEntity);
  const machineSpans = entities.filter((entity) => !isManualEntity(entity));
  const machineBySource = machineSpans.reduce((counts, entity) => {
    const key = entity.source || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  const manualValues = new Set(
    manualSpans.map((entity) => `${entity.label}:${entity.text.toLocaleLowerCase()}`),
  );
  const machineValues = new Set(
    machineSpans.map((entity) => `${entity.label}:${entity.text.toLocaleLowerCase()}`),
  );

  let mixedValueCount = 0;
  manualValues.forEach((key) => {
    if (machineValues.has(key)) {
      mixedValueCount += 1;
    }
  });

  return {
    manualSpans,
    machineSpans,
    machineBySource,
    manualOnlyValues: manualValues.size - mixedValueCount,
    machineOnlyValues: machineValues.size - mixedValueCount,
    mixedValues: mixedValueCount,
  };
}

function formatSpanOffset(start, end) {
  return `${start}–${end}`;
}

function formatSpanPositionLines(spans) {
  if (!spans.length) {
    return "";
  }

  return [...spans]
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .map((span) => {
      const sourceLabel = isManualEntity(span) ? "manual" : span.source || "unknown";
      return `  - chars ${formatSpanOffset(span.start, span.end)}: ${sourceLabel}`;
    })
    .join("\n");
}

function formatValueDecisionLine({
  category,
  customCategories,
  value,
  replacement,
  occurrences,
  provenance,
  status,
}) {
  const label = getCategoryLabel(category, customCategories);
  const provenanceDetail = formatSpanProvenanceDetail(provenance);
  const origin =
    provenance.manualSpans.length && provenance.machineSpans.length
      ? "mixed origin"
      : provenance.manualSpans.length
        ? "human manual review"
        : "automatic detection";
  const positionLines = formatSpanPositionLines(provenance.spans);

  let header;
  if (status === "replaced") {
    header = `- ${label}: "${value}" -> ${replacement} (${occurrences} span${occurrences === 1 ? "" : "s"}, ${provenanceDetail}; origin: ${origin})`;
  } else {
    header = `- ${label}: "${value}" kept unchanged (${occurrences} span${occurrences === 1 ? "" : "s"}, ${provenanceDetail}; origin: ${origin}; toggled off during review)`;
  }

  return positionLines ? `${header}\n${positionLines}` : header;
}

function formatSpanIndexLines(entities, selectedCategories, excludedEntityKeys, customCategories) {
  return [...entities]
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .map((entity) => {
      const label = getCategoryLabel(entity.label, customCategories);
      const sourceLabel = isManualEntity(entity) ? "manual" : entity.source || "unknown";
      const active = isEntityActive(entity, selectedCategories, excludedEntityKeys);
      const status = active ? "replaced in output" : "excluded from output";
      return `- chars ${formatSpanOffset(entity.start, entity.end)} | ${label} | "${entity.text}" | ${sourceLabel} | ${status}`;
    });
}

function createCategorySelectionFromEntities(entities) {
  return Object.fromEntries(
    [...new Set(entities.map((entity) => entity.label))].map((label) => [label, true]),
  );
}

function buildBatchFileOutputs({
  sourceFileName,
  fileText,
  entities,
  selectedCategories,
  excludedEntityKeys,
  customCategories,
  modelName,
  nerBackend,
}) {
  const grouped = groupEntities(entities);
  const anonymizedText = replaceSelectedCategories(
    fileText,
    entities,
    grouped,
    selectedCategories,
    excludedEntityKeys,
    customCategories,
  );
  const activeEntities = entities.filter((entity) =>
    isEntityActive(entity, selectedCategories, excludedEntityKeys),
  );
  const auditReport = createAuditReport({
    text: fileText,
    entities,
    anonymizedText,
    groupedEntities: grouped,
    selectedCategories,
    excludedEntityKeys,
    modelName,
    sourceFile: sourceFileName,
    nerBackend,
    batchMode: true,
    customCategories,
  });
  const labelStudioJson = JSON.stringify(
    createLabelStudioExport({
      text: fileText,
      entities: activeEntities,
      modelName,
      nerBackend,
      sourceFile: sourceFileName,
      customCategories,
    }),
    null,
    2,
  );

  return { anonymizedText, auditReport, labelStudioJson };
}

function findBatchFileIndex(files, query) {
  const trimmed = query.trim();
  if (!trimmed || !files.length) {
    return -1;
  }

  let index = files.findIndex((file) => file.name === trimmed);
  if (index >= 0) {
    return index;
  }

  const lower = trimmed.toLocaleLowerCase();
  index = files.findIndex((file) => file.name.toLocaleLowerCase() === lower);
  if (index >= 0) {
    return index;
  }

  const partialMatches = files
    .map((file, fileIndex) => ({ file, fileIndex }))
    .filter(({ file }) => file.name.toLocaleLowerCase().includes(lower));

  return partialMatches.length === 1 ? partialMatches[0].fileIndex : -1;
}


export default function App() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [entities, setEntities] = useState([]);
  const [modelName, setModelName] = useState(null);
  const [nerBackend, setNerBackend] = useState("spacy-lg");
  const [selectedCategories, setSelectedCategories] = useState({});
  const [excludedEntityKeys, setExcludedEntityKeys] = useState({});
  const [reportOpen, setReportOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchFolder, setBatchFolder] = useState(null);
  const [batchOutputDir, setBatchOutputDir] = useState(null);
  const [currentFileOutputsModified, setCurrentFileOutputsModified] = useState(false);
  const [jumpFileNumber, setJumpFileNumber] = useState("1");
  const [jumpFileName, setJumpFileName] = useState("");
  const [batchFiles, setBatchFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [autoRunNer, setAutoRunNer] = useState(true);
  const [status, setStatus] = useState("Paste text, choose a NER backend, then run detection.");
  const [error, setError] = useState("");
  const [entityMenu, setEntityMenu] = useState(null);
  const [customCategories, setCustomCategories] = useState({});

  const fileStatesRef = useRef({});
  const batchCustomCategoriesRef = useRef({});
  const entityMenuRef = useRef(null);
  const writeTimeoutRef = useRef(null);
  const currentFile = batchFiles[currentFileIndex] || null;

  function syncCustomCategories(next, batchScoped = batchMode) {
    setCustomCategories(next);
    if (batchScoped) {
      batchCustomCategoriesRef.current = next;
    }
  }

  function mergeCustomCategories(partial) {
    const base = batchMode ? batchCustomCategoriesRef.current : customCategories;
    const next = { ...base, ...partial };
    syncCustomCategories(next, batchMode);
    return next;
  }

  function resolveCustomCategoriesForBatch(nextEntities, savedState) {
    return inferCustomCategoriesFromEntities(nextEntities, {
      ...batchCustomCategoriesRef.current,
      ...(savedState?.customCategories ?? {}),
    });
  }

  useEffect(() => {
    entityMenuRef.current = entityMenu;
  }, [entityMenu]);

  useEffect(() => {
    if (!batchMode || !currentFile) {
      return;
    }

    setJumpFileNumber(String(currentFileIndex + 1));
    setJumpFileName(currentFile.name);
  }, [batchMode, currentFile, currentFileIndex]);

  const categoryLabels = useMemo(
    () => buildCategoryLabels(customCategories),
    [customCategories],
  );
  const menuCategories = useMemo(
    () => buildMenuCategories(customCategories),
    [customCategories],
  );
  const groupedEntities = useMemo(() => groupEntities(entities), [entities]);
  const highlightedSegments = useMemo(
    () => createHighlightSegments(text, entities),
    [text, entities],
  );
  const anonymizedText = useMemo(
    () =>
      replaceSelectedCategories(
        text,
        entities,
        groupedEntities,
        selectedCategories,
        excludedEntityKeys,
        customCategories,
      ),
    [text, entities, groupedEntities, selectedCategories, excludedEntityKeys, customCategories],
  );
  const activeEntities = useMemo(
    () =>
      entities.filter((entity) =>
        isEntityActive(entity, selectedCategories, excludedEntityKeys),
      ),
    [entities, selectedCategories, excludedEntityKeys],
  );
  const auditReport = useMemo(
    () =>
      createAuditReport({
        text,
        entities,
        anonymizedText,
        groupedEntities,
        selectedCategories,
        excludedEntityKeys,
        modelName,
        sourceFile: currentFile?.name || null,
        nerBackend: batchMode ? nerBackend : null,
        batchMode,
        customCategories,
      }),
    [
      text,
      entities,
      anonymizedText,
      groupedEntities,
      selectedCategories,
      excludedEntityKeys,
      modelName,
      currentFile,
      nerBackend,
      batchMode,
      customCategories,
    ],
  );
  const labelStudioExport = useMemo(
    () =>
      createLabelStudioExport({
        text,
        entities: activeEntities,
        modelName,
        nerBackend,
        sourceFile: currentFile?.name || null,
        customCategories,
      }),
    [text, activeEntities, modelName, nerBackend, currentFile, customCategories],
  );
  const labelStudioJson = useMemo(
    () => JSON.stringify(labelStudioExport, null, 2),
    [labelStudioExport],
  );

  useEffect(() => {
    if (!batchMode || !currentFile || !batchOutputDir || !window.nerApi?.writeBatchOutputs) {
      return undefined;
    }

    if (writeTimeoutRef.current) {
      clearTimeout(writeTimeoutRef.current);
    }

    writeTimeoutRef.current = setTimeout(async () => {
      try {
        await writeBatchOutputsForFile(currentFile, {
          modified: currentFileOutputsModified,
        });
      } catch (caughtError) {
        setError(caughtError.message);
      }
    }, 400);

    return () => {
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }
    };
  }, [
    batchMode,
    currentFile,
    batchOutputDir,
    currentFileOutputsModified,
    anonymizedText,
    auditReport,
    labelStudioJson,
  ]);

  async function writeBatchOutputsForFile(
    file,
    {
      modified,
      fileText = text,
      fileEntities = entities,
      fileSelectedCategories = selectedCategories,
      fileExcludedEntityKeys = excludedEntityKeys,
      fileCustomCategories = customCategories,
      fileModelName = modelName,
    },
  ) {
    if (!batchOutputDir || !window.nerApi?.writeBatchOutputs) {
      return;
    }

    const { anonymizedText: nextAnonymizedText, auditReport: nextAuditReport, labelStudioJson: nextLabelStudioJson } =
      buildBatchFileOutputs({
        sourceFileName: file.name,
        fileText,
        entities: fileEntities,
        selectedCategories: fileSelectedCategories,
        excludedEntityKeys: fileExcludedEntityKeys,
        customCategories: fileCustomCategories,
        modelName: fileModelName,
        nerBackend,
      });

    await window.nerApi.writeBatchOutputs({
      sourcePath: file.path,
      outputDir: batchOutputDir,
      modified,
      anonymizedText: nextAnonymizedText,
      auditReport: nextAuditReport,
      labelStudioJson: nextLabelStudioJson,
      labelStudioConfig: LABEL_STUDIO_NER_CONFIG,
    });
  }

  async function writeCurrentBatchOutputs(modified = currentFileOutputsModified) {
    if (!batchMode || !currentFile) {
      return;
    }

    await writeBatchOutputsForFile(currentFile, { modified });
  }

  function persistCurrentFileState() {
    if (!batchMode || !currentFile) {
      return;
    }

    fileStatesRef.current[currentFile.path] = {
      text,
      entities,
      selectedCategories,
      excludedEntityKeys,
      modelName,
      outputsModified: currentFileOutputsModified,
    };
  }

  function applyFileState(file, savedState, options = {}) {
    const { isBatchNavigation = batchMode } = options;
    const nextEntities = savedState?.entities ?? [];
    setText(savedState?.text ?? file.text);
    setEntities(nextEntities);
    setSelectedCategories(savedState?.selectedCategories ?? {});
    setExcludedEntityKeys(savedState?.excludedEntityKeys ?? {});
    setModelName(savedState?.modelName ?? null);
    setCurrentFileOutputsModified(savedState?.outputsModified ?? false);

    if (isBatchNavigation) {
      syncCustomCategories(resolveCustomCategoriesForBatch(nextEntities, savedState), true);
    } else {
      syncCustomCategories(
        inferCustomCategoriesFromEntities(nextEntities, savedState?.customCategories ?? {}),
        false,
      );
      batchCustomCategoriesRef.current = {};
    }
    setEntityMenu(null);
    setReportOpen(false);
    setError("");
  }

  async function goToFile(index) {
    if (!batchMode || index < 0 || index >= batchFiles.length || index === currentFileIndex) {
      return;
    }

    persistCurrentFileState();
    fileStatesRef.current[currentFile.path] = {
      ...fileStatesRef.current[currentFile.path],
      outputsModified: true,
    };

    try {
      await writeBatchOutputsForFile(currentFile, {
        modified: true,
        fileText: text,
        fileEntities: entities,
        fileSelectedCategories: selectedCategories,
        fileExcludedEntityKeys: excludedEntityKeys,
        fileCustomCategories: customCategories,
        fileModelName: modelName,
      });
    } catch (caughtError) {
      setError(caughtError.message);
    }

    const file = batchFiles[index];
    const savedState = fileStatesRef.current[file.path];
    const fileText = savedState?.text ?? file.text;
    setCurrentFileIndex(index);
    applyFileState(file, savedState);

    if (autoRunNer && !savedState?.entities?.length) {
      await runNerDetection({
        sourceText: fileText,
        fileName: file.name,
        filePosition: `${index + 1} of ${batchFiles.length}`,
      });
      return;
    }

    setStatus(`File ${index + 1} of ${batchFiles.length}: ${file.name}`);
  }

  async function handleJumpToFileNumber(event) {
    event?.preventDefault();

    if (!batchMode || isBatchLoading || isDetecting) {
      return;
    }

    const parsed = Number(jumpFileNumber);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > batchFiles.length) {
      setStatus(`Enter a file number between 1 and ${batchFiles.length}.`);
      return;
    }

    await goToFile(parsed - 1);
  }

  async function handleJumpToFileName(event) {
    event?.preventDefault();

    if (!batchMode || isBatchLoading || isDetecting) {
      return;
    }

    const index = findBatchFileIndex(batchFiles, jumpFileName);
    if (index < 0) {
      setStatus(`No file matches "${jumpFileName.trim()}".`);
      return;
    }

    await goToFile(index);
  }

  async function processInitialBatchFolder(files, outputDir, backend) {
    if (!window.nerApi?.detectEntities || !window.nerApi?.writeBatchOutputs) {
      throw new Error("Batch processing is only available in the Electron app.");
    }

    setIsDetecting(true);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setStatus(`Initial processing: ${index + 1} of ${files.length} — ${file.name}...`);

        const result = await window.nerApi.detectEntities(file.text, backend);
        const normalized = normalizeEntities(result.entities || [], file.text);
        const categorySelection = createCategorySelectionFromEntities(normalized);
        const { anonymizedText, auditReport, labelStudioJson } = buildBatchFileOutputs({
          sourceFileName: file.name,
          fileText: file.text,
          entities: normalized,
          selectedCategories: categorySelection,
          excludedEntityKeys: {},
          customCategories: {},
          modelName: result.model,
          nerBackend: backend,
        });

        await window.nerApi.writeBatchOutputs({
          sourcePath: file.path,
          outputDir,
          modified: false,
          anonymizedText,
          auditReport,
          labelStudioJson,
          labelStudioConfig: LABEL_STUDIO_NER_CONFIG,
        });

        fileStatesRef.current[file.path] = {
          text: file.text,
          entities: normalized,
          selectedCategories: categorySelection,
          excludedEntityKeys: {},
          modelName: result.model,
          outputsModified: false,
        };
      }
    } finally {
      setIsDetecting(false);
    }
  }

  async function loadBatchFolder() {
    setError("");

    if (!window.nerApi?.loadTextFolder) {
      setError("Batch folder loading is only available in the Electron app.");
      return;
    }

    setIsBatchLoading(true);
    setStatus("Choose a folder with text files...");

    try {
      const result = await window.nerApi.loadTextFolder();

      if (result.canceled) {
        setStatus(
          batchMode
            ? `Batch mode: ${batchFiles.length} file(s) loaded.`
            : "Batch folder loading canceled.",
        );
        return;
      }

      fileStatesRef.current = {};
      batchCustomCategoriesRef.current = {};
      setBatchMode(true);
      setBatchFolder(result.folderPath);
      setBatchOutputDir(result.outputDir);
      setBatchFiles(result.files);
      setCurrentFileIndex(0);
      syncCustomCategories({});
      await processInitialBatchFolder(result.files, result.outputDir, nerBackend);
      applyFileState(result.files[0], fileStatesRef.current[result.files[0].path], {
        isBatchNavigation: true,
      });
      setStatus(
        `Loaded and processed ${result.files.length} file(s). Initial outputs are in ${result.outputDir}.`,
      );
    } catch (caughtError) {
      setError(caughtError.message);
      setStatus("Batch folder loading failed.");
    } finally {
      setIsBatchLoading(false);
    }
  }

  async function exitBatchMode() {
    if (batchMode && currentFile) {
      persistCurrentFileState();
      fileStatesRef.current[currentFile.path] = {
        ...fileStatesRef.current[currentFile.path],
        outputsModified: true,
      };

      try {
        await writeBatchOutputsForFile(currentFile, {
          modified: true,
          fileText: text,
          fileEntities: entities,
          fileSelectedCategories: selectedCategories,
          fileExcludedEntityKeys: excludedEntityKeys,
          fileCustomCategories: customCategories,
          fileModelName: modelName,
        });
      } catch (caughtError) {
        setError(caughtError.message);
      }
    }

    fileStatesRef.current = {};
    batchCustomCategoriesRef.current = {};
    setBatchMode(false);
    setBatchFolder(null);
    setBatchOutputDir(null);
    setBatchFiles([]);
    setCurrentFileIndex(0);
    setCurrentFileOutputsModified(false);
    setText(SAMPLE_TEXT);
    setEntities([]);
    setSelectedCategories({});
    setExcludedEntityKeys({});
    setModelName(null);
    setCustomCategories({});
    setEntityMenu(null);
    setReportOpen(false);
    setStatus("Batch mode closed. Restored the sample text.");
    setError("");
  }

  async function clearSession() {
    if (batchMode) {
      await exitBatchMode();
      return;
    }

    setText("");
    setEntities([]);
    setSelectedCategories({});
    setExcludedEntityKeys({});
    setModelName(null);
    setReportOpen(false);
    setStatus("Session cleared.");
    setError("");
  }

  async function runNerDetection({
    sourceText = text,
    backend = nerBackend,
    fileName = null,
    filePosition = null,
  } = {}) {
    const textToAnalyze = sourceText ?? text;
    if (!textToAnalyze.trim()) {
      return null;
    }

    setError("");
    setIsDetecting(true);
    setStatus(
      `Running ${NER_BACKENDS[backend]}. The first run can take 20-60 seconds while the model warms up...`,
    );

    try {
      if (!window.nerApi) {
        throw new Error("Electron preload API is unavailable. Start the app with npm run dev.");
      }

      const result = await window.nerApi.detectEntities(textToAnalyze, backend);
      const normalized = normalizeEntities(result.entities || [], textToAnalyze);
      const categorySelection = createCategorySelectionFromEntities(normalized);

      setEntities(normalized);
      setSelectedCategories(categorySelection);
      setExcludedEntityKeys({});
      setModelName(result.model);

      const uniqueCount = Object.values(
        normalized.reduce((groups, entity) => {
          const key = `${entity.label}:${entity.text.toLocaleLowerCase()}`;
          groups[key] = true;
          return groups;
        }, {}),
      ).length;
      const fileNote = fileName
        ? ` for ${fileName}${filePosition ? ` (${filePosition})` : ""}`
        : batchMode && currentFile
          ? ` for ${currentFile.name}`
          : "";
      setStatus(
        `Detected ${normalized.length} entities (${uniqueCount} unique value${uniqueCount === 1 ? "" : "s"}) using ${result.model} (${backend})${fileNote}.`,
      );

      return {
        entities: normalized,
        selectedCategories: categorySelection,
        modelName: result.model,
      };
    } catch (caughtError) {
      setError(caughtError.message);
      setStatus("Detection failed.");
      return null;
    } finally {
      setIsDetecting(false);
    }
  }

  async function detectEntities() {
    await runNerDetection({
      sourceText: text,
      fileName: batchMode ? currentFile?.name : null,
      filePosition:
        batchMode && currentFile ? `${currentFileIndex + 1} of ${batchFiles.length}` : null,
    });
  }

  function toggleAutoRunNer(enabled) {
    setAutoRunNer(enabled);

    if (!enabled || !batchMode || !currentFile || isDetecting || entities.length) {
      return;
    }

    const savedState = fileStatesRef.current[currentFile.path];
    if (savedState?.entities?.length) {
      return;
    }

    void runNerDetection({
      sourceText: text,
      fileName: currentFile.name,
      filePosition: `${currentFileIndex + 1} of ${batchFiles.length}`,
    });
  }

  function toggleCategory(category) {
    setSelectedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  function toggleEntityValue(category, entityText) {
    const key = getEntityValueKey(category, entityText);
    setExcludedEntityKeys((current) => {
      const next = { ...current };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  }

  function copyAnonymizedText() {
    navigator.clipboard.writeText(anonymizedText);
    setStatus("Anonymized text copied to clipboard.");
  }

  function copyAuditReport() {
    navigator.clipboard.writeText(auditReport);
    setStatus("Audit report copied to clipboard.");
  }

  function downloadAuditReport() {
    downloadFile(auditReport, "anonymization-audit-report.md", "text/markdown;charset=utf-8");
    setStatus("Audit report downloaded.");
  }

  async function downloadLabelStudioExport() {
    const exportData = createLabelStudioExport({
      text,
      entities: activeEntities,
      modelName,
      nerBackend,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const jsonContent = JSON.stringify(exportData, null, 2);
    const defaultBaseName = `label-studio-ner-${stamp}`;

    try {
      if (!window.nerApi?.exportLabelStudio) {
        throw new Error("Export API unavailable.");
      }

      const result = await window.nerApi.exportLabelStudio({
        jsonContent,
        configContent: LABEL_STUDIO_NER_CONFIG,
        defaultBaseName,
      });

      if (result.canceled) {
        setStatus("Label Studio export canceled.");
        return;
      }

      setStatus(
        `Exported ${entities.length} pre-annotations and config to ${result.jsonPath} and ${result.configPath}.`,
      );
    } catch {
      downloadFile(jsonContent, `${defaultBaseName}.json`, "application/json;charset=utf-8");
      setStatus(
        `Exported ${entities.length} annotations. Restart the app to also save the labeling config file.`,
      );
    }
  }

  async function batchAnonymizeFromLabelStudio() {
    setError("");

    if (!window.nerApi?.batchAnonymizeLabelStudio) {
      setError("Batch anonymization is only available in the Electron app.");
      return;
    }

    setIsBatchLoading(true);
    setStatus("Choose the folder with Label Studio JSON exports...");

    try {
      const result = await window.nerApi.batchAnonymizeLabelStudio();

      if (result.canceled) {
        setStatus("Batch anonymization canceled.");
        return;
      }

      const errorCount = result.errors?.length || 0;
      const errorNote =
        errorCount > 0 ? ` ${errorCount} file(s) failed; see batch-summary.json.` : "";

      setStatus(
        `Processed ${result.tasks_processed} task(s) from ${result.json_files} JSON file(s) into ${result.output_dir}.${errorNote}`,
      );
    } catch (caughtError) {
      setError(caughtError.message);
      setStatus("Batch anonymization failed.");
    } finally {
      setIsBatchLoading(false);
    }
  }

  function closeEntityMenu() {
    entityMenuRef.current = null;
    setEntityMenu(null);
  }

  function setEntityMenuScope(scope) {
    setEntityMenu((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, scope };
      entityMenuRef.current = next;
      return next;
    });
  }

  function addManualEntity(categoryId, displayLabel = null) {
    const menu = entityMenuRef.current;
    if (!menu || menu.mode !== "add") return;

    const scope = menu.scope === "single" ? "single" : "all";
    const spans =
      scope === "single"
        ? [{ start: menu.start, end: menu.end, text: menu.text }]
        : findAllOccurrenceRanges(text, menu.text);

    const next = addEntitySpans(entities, spans, categoryId, text);

    setEntities(next);
    setSelectedCategories((current) => ({
      ...current,
      [categoryId]: current[categoryId] ?? true,
    }));
    closeEntityMenu();
    const count = spans.length;
    const scopeNote =
      count === 1 ? "" : scope === "all" ? ` (${count} occurrences)` : " (this selection only)";
    setStatus(
      `Added ${displayLabel || getCategoryLabel(categoryId, customCategories)} entity "${menu.text}"${scopeNote}.`,
    );
  }

  function handleAddEntity(label) {
    addManualEntity(label);
  }

  function handleAddCustomCategory(displayName) {
    const trimmed = displayName.trim();
    const menu = entityMenuRef.current;
    if (!trimmed || !menu || menu.mode !== "add") {
      return;
    }

    const categoryId = createCustomCategoryId(
      trimmed,
      batchMode ? batchCustomCategoriesRef.current : customCategories,
    );
    addManualEntity(categoryId, trimmed);
    mergeCustomCategories({ [categoryId]: trimmed });
  }

  function handleRemoveEntity() {
    if (!entityMenu || entityMenu.mode !== "remove") return;

    const next = removeEntityById(entities, entityMenu.entity.id);
    setEntities(next);
    closeEntityMenu();
    setStatus(`Removed entity "${entityMenu.entity.text}".`);
  }

  return (
    <>
      {window.appMeta?.isElectron ? (
        <header
          className={`window-titlebar window-titlebar--${window.appMeta.platform}`}
          aria-label="Incognito"
        >
          <div className="window-titlebar-brand">
            <img
              className="window-titlebar-logo"
              src="./logo.png"
              alt=""
              width={22}
              height={22}
            />
            <span className="window-titlebar-name">Incognito</span>
          </div>
        </header>
      ) : null}
      <main className="app">
        <header className="hero">
          <div>
            <div className="hero-brand">
              <img
                className="hero-logo"
                src="./logo.png"
                alt=""
                width={72}
                height={72}
              />
              <div className="hero-brand-text">
                <h1>Incognito</h1>
                <p className="hero-tagline">Privacy-first qualitative data anonymization</p>
              </div>
            </div>

            <p>
              🔒 Anonymize your textual data with complete confidentiality<br />
              🕵️‍♂️ Detect named entities<br />
              👀 Review the identified occurrences<br />
              📑 Generate an anonymized audit report
            </p>
            <p className="credits">
              👨‍💻 Developed by{" "}
              <a href="https://xiaoouwang.github.io/" target="_blank" rel="noreferrer">
                Xiaoou Wang
              </a>
              {" · "}Digital Humanities Engineer{" · "}
              <a href="https://mshs.univ-cotedazur.fr/" target="_blank" rel="noreferrer">
                MSHS Sud-Est
              </a>
              {" · "}
              <a href="https://univ-cotedazur.fr/" target="_blank" rel="noreferrer">
                Université Côte d&apos;Azur
              </a>

            </p>
          </div>
          <aside className="privacy-note">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span role="img" aria-label="lock" style={{ fontSize: "2em" }}>🔒</span>
              <div>
                <strong style={{ fontSize: "1.1em" }}>Your Data Stays Private</strong>
                <br />
                <div style={{ fontSize: "0.95em", marginTop: 2 }}>
                  Your text is <strong>only</strong> sent to your local Python NER process.<br />
                  <span style={{ color: "#555" }}>Never shared, never sent to external servers or AI APIs.</span>
                </div>
              </div>
            </div>
          </aside>

        </header>

        <section className="controls">
          <label className="backend-select">
            Default model
            <select
              value={nerBackend}
              onChange={(event) => {
                setNerBackend(event.target.value);
                setEntities([]);
                setSelectedCategories({});
                setExcludedEntityKeys({});
                setModelName(null);
                setStatus(
                  `Default model set to ${NER_BACKENDS[event.target.value]}. Run detection again.`,
                );
              }}
              disabled={isDetecting}
            >
              <option value="spacy-sm">{NER_BACKENDS["spacy-sm"]}</option>
              <option value="spacy-lg">{NER_BACKENDS["spacy-lg"]}</option>
              <option value="camembert">{NER_BACKENDS.camembert}</option>
            </select>
          </label>
          <button onClick={detectEntities} disabled={!text.trim() || isDetecting}>
            {isDetecting ? "Detecting..." : "Run NER"}
          </button>
          <button onClick={copyAnonymizedText} disabled={!entities.length}>
            Copy anonymized text
          </button>
          <button onClick={() => setReportOpen(true)} disabled={!entities.length}>
            Show audit report
          </button>
          <button
            className="secondary"
            onClick={downloadLabelStudioExport}
            disabled={!entities.length || isBatchLoading}
          >
            Export to Label Studio
          </button>
          <button
            className="secondary"
            onClick={batchAnonymizeFromLabelStudio}
            disabled={isDetecting || isBatchLoading}
          >
            {isBatchLoading ? "Processing..." : "Batch from Label Studio"}
          </button>
          {batchMode && (
            <>
              <button
                className="secondary"
                onClick={() => goToFile(currentFileIndex - 1)}
                disabled={currentFileIndex === 0 || isBatchLoading || isDetecting}
              >
                Previous file
              </button>
              <button
                className="secondary"
                onClick={() => goToFile(currentFileIndex + 1)}
                disabled={currentFileIndex >= batchFiles.length - 1 || isBatchLoading || isDetecting}
              >
                Next file
              </button>
            </>
          )}
          <button
            className="secondary"
            onClick={clearSession}
            disabled={isBatchLoading}
          >
            {batchMode ? "Close folder" : "Clear"}
          </button>
          <span className="status">{status}</span>
        </section>

        <section className="batch-panel panel">
          <div className="panel-header">
            <div>
              <h2>Batch text folder</h2>
              <p className="batch-description">
                Load a folder of <code>.txt</code> or <code>.text</code> files. Each load creates a
                new timestamped <code>outputs-YYYYMMDD-HHMMSS</code> subfolder, runs the selected model
                on every file, then review each document with previous/next navigation or jump directly
                to a file number or name.
              </p>
            </div>
            <button onClick={loadBatchFolder} disabled={isDetecting || isBatchLoading}>
              {isBatchLoading ? "Loading folder..." : batchMode ? "Load another folder" : "Load text folder"}
            </button>
          </div>

          {batchMode ? (
            <>
              <div className="batch-navigation">
                <button
                  onClick={() => goToFile(currentFileIndex - 1)}
                  disabled={currentFileIndex === 0 || isBatchLoading || isDetecting}
                >
                  Previous file
                </button>
                <div className="batch-file-indicator">
                  <strong>
                    {currentFileIndex + 1} / {batchFiles.length}
                  </strong>
                  <span>{currentFile?.name}</span>
                  <small>{batchFolder}</small>
                  {batchOutputDir ? <small>{batchOutputDir}</small> : null}
                </div>
                <button
                  onClick={() => goToFile(currentFileIndex + 1)}
                  disabled={currentFileIndex >= batchFiles.length - 1 || isBatchLoading || isDetecting}
                >
                  Next file
                </button>
              </div>

              <div className="batch-jump-controls">
                <form className="batch-jump-field" onSubmit={handleJumpToFileNumber}>
                  <label htmlFor="batch-jump-number">Go to file #</label>
                  <div className="batch-jump-row">
                    <input
                      id="batch-jump-number"
                      type="number"
                      min={1}
                      max={batchFiles.length}
                      value={jumpFileNumber}
                      onChange={(event) => setJumpFileNumber(event.target.value)}
                      disabled={isBatchLoading || isDetecting}
                    />
                    <button type="submit" disabled={isBatchLoading || isDetecting}>
                      Go
                    </button>
                  </div>
                </form>

                <form className="batch-jump-field" onSubmit={handleJumpToFileName}>
                  <label htmlFor="batch-jump-name">Go to file name</label>
                  <div className="batch-jump-row">
                    <input
                      id="batch-jump-name"
                      list="batch-file-list"
                      value={jumpFileName}
                      onChange={(event) => setJumpFileName(event.target.value)}
                      placeholder="Type or pick a file name"
                      disabled={isBatchLoading || isDetecting}
                    />
                    <datalist id="batch-file-list">
                      {batchFiles.map((file, index) => (
                        <option key={file.path} value={file.name}>
                          {index + 1}. {file.name}
                        </option>
                      ))}
                    </datalist>
                    <button type="submit" disabled={isBatchLoading || isDetecting}>
                      Go
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : null}

          <label className="batch-auto-ner">
            <input
              type="checkbox"
              checked={autoRunNer}
              onChange={(event) => toggleAutoRunNer(event.target.checked)}
              disabled={isDetecting}
            />
            <span>
              Auto-run default model when opening an unprocessed file
              <small>Uses {NER_BACKENDS[nerBackend]} for files without saved detections.</small>
            </span>
          </label>

          <p className="batch-output-note">
            Initial outputs per file: <code>*-anonymized.txt</code>, <code>*-report.md</code>, and{" "}
            <code>*-label-studio.json</code> in the current timestamped outputs folder, plus shared{" "}
            <code>label-studio-ner-config.xml</code>. When you switch to another file, the file you
            leave is saved with a <code>_modified</code> suffix (for example{" "}
            <code>*-anonymized_modified.txt</code>).
          </p>
        </section>

        {error && (
          <section className="error-card">
            <strong>NER setup needed</strong>
            <p>{error}</p>
            <p>
              Install Python dependencies with <code>pip install -r requirements.txt</code>.
              For spaCy, install French models with{" "}
              <code>python -m spacy download fr_core_news_sm</code> and{" "}
              <code>python -m spacy download fr_core_news_lg</code>.
              For CamemBERT, also run{" "}
              <code>pip install -r requirements-camembert.txt</code> (Python 3.12
              required). The model downloads automatically on first use via Hugging
              Face.
            </p>
          </section>
        )}

        <section className="workspace">
          <div className="panel">
            <div className="panel-header">
              <h2>{batchMode ? "1. Source Text" : "1. Paste Text"}</h2>
              <span>
                {batchMode && currentFile ? `${currentFile.name} · ` : ""}
                {text.length} characters
              </span>
            </div>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setEntities([]);
                setSelectedCategories({});
                setExcludedEntityKeys({});
                setModelName(null);
                setEntityMenu(null);
              }}
              placeholder="Paste interview transcript or field notes here..."
            />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>2. Replace Categories?</h2>
              <span>
                {modelName
                  ? `Model: ${modelName} (${nerBackend}) · click entities to toggle`
                  : `Backend: ${NER_BACKENDS[nerBackend]}`}
              </span>
            </div>
            <CategoryReview
              entities={entities}
              groupedEntities={groupedEntities}
              categoryLabels={categoryLabels}
              selectedCategories={selectedCategories}
              excludedEntityKeys={excludedEntityKeys}
              onToggleCategory={toggleCategory}
              onToggleEntity={toggleEntityValue}
            />
          </div>
        </section>

        <section className="preview-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>3. Highlighted Entities</h2>
              <span>
                {entities.length} spans · select text to add (all word matches by default) · click highlight to remove
              </span>
            </div>
            <HighlightedText
              text={text}
              segments={highlightedSegments}
              categoryLabels={categoryLabels}
              selectedCategories={selectedCategories}
              excludedEntityKeys={excludedEntityKeys}
              onAddSelection={(selection) => {
                const nextMenu = {
                  mode: "add",
                  scope: "all",
                  ...selection,
                };
                entityMenuRef.current = nextMenu;
                setEntityMenu(nextMenu);
              }}
              onEntityClick={(entity, position) => {
                const nextMenu = {
                  mode: "remove",
                  entity,
                  ...position,
                };
                entityMenuRef.current = nextMenu;
                setEntityMenu(nextMenu);
              }}
            />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>4. Anonymized Preview</h2>
              <span>Selected categories only</span>
            </div>
            <pre className="text-preview">{anonymizedText || "Run detection to preview replacements."}</pre>
          </div>
        </section>

        {entityMenu && (
          <EntityEditMenu
            menu={entityMenu}
            sourceText={text}
            menuCategories={menuCategories}
            categoryLabels={categoryLabels}
            onScopeChange={setEntityMenuScope}
            onAdd={handleAddEntity}
            onAddCustom={handleAddCustomCategory}
            onRemove={handleRemoveEntity}
            onClose={closeEntityMenu}
          />
        )}

        {reportOpen && (
          <AuditReportWindow
            report={auditReport}
            onClose={() => setReportOpen(false)}
            onCopy={copyAuditReport}
            onDownload={downloadAuditReport}
          />
        )}
      </main>
    </>
  );
}

function AuditReportWindow({ report, onClose, onCopy, onDownload }) {
  return (
    <div className="report-backdrop" role="presentation">
      <section className="report-window" role="dialog" aria-modal="true" aria-label="Audit report">
        <div className="report-header">
          <div>
            <p className="eyebrow">Research documentation</p>
            <h2>Audit Report</h2>
          </div>
          <div className="report-actions">
            <button onClick={onCopy}>Copy report</button>
            <button onClick={onDownload}>Download .md</button>
            <button className="secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <pre className="report-body">{report}</pre>
      </section>
    </div>
  );
}

function CategoryReview({
  entities,
  groupedEntities,
  categoryLabels,
  selectedCategories,
  excludedEntityKeys,
  onToggleCategory,
  onToggleEntity,
}) {
  const categories = Object.keys(groupedEntities);

  if (!categories.length) {
    return (
      <div className="empty-state">
        Run NER or add entities manually in the highlighted view below.
      </div>
    );
  }

  return (
    <div className="category-list">
      {categories.map((category) => (
        <article className="category-card" key={category}>
          <label className="category-toggle">
            <input
              type="checkbox"
              checked={Boolean(selectedCategories[category])}
              onChange={() => onToggleCategory(category)}
            />
            <span>
              Replace {categoryLabels[category] || category}
              <small>{groupedEntities[category].length} unique value(s)</small>
            </span>
          </label>
          <div className="entity-chips">
            {groupedEntities[category].map((entity) => {
              const occurrenceCount = countEntitySpans(entities, category, entity.text);
              const isActive =
                Boolean(selectedCategories[category]) &&
                !excludedEntityKeys[getEntityValueKey(category, entity.text)];

              return (
                <button
                  type="button"
                  className={`chip ${getCategoryChipClass(category)} ${isActive ? "chip-active" : "chip-inactive"}`}
                  key={entity.key}
                  onClick={() => onToggleEntity(category, entity.text)}
                  title={
                    isActive
                      ? "Click to keep this value unchanged in the output"
                      : "Click to include this value in anonymization again"
                  }
                >
                  <span className="chip-label">{entity.text}</span>
                  <span className="chip-count">{occurrenceCount}</span>
                </button>
              );
            })}
          </div>
        </article>
      ))}
      <p className="category-hint">Click an entity to toggle all of its occurrences in the output.</p>
    </div>
  );
}

function EntityEditMenu({
  menu,
  sourceText,
  menuCategories,
  categoryLabels,
  onScopeChange,
  onAdd,
  onAddCustom,
  onRemove,
  onClose,
}) {
  const menuRef = useRef(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [position, setPosition] = useState({ top: menu.y, left: menu.x });
  const scope = menu.mode === "add" && menu.scope === "single" ? "single" : "all";
  const occurrenceCount = useMemo(() => {
    if (menu.mode !== "add" || typeof menu.text !== "string") {
      return 0;
    }

    return countOccurrences(sourceText, menu.text);
  }, [menu.mode, menu.text, sourceText]);

  useEffect(() => {
    setNewCategoryName("");
  }, [menu.mode, menu.start, menu.end, menu.text, menu.entity?.id]);

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) {
      return;
    }

    const margin = 12;
    const rect = element.getBoundingClientRect();
    let top = menu.y;
    let left = menu.x;

    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }
    if (left < margin) {
      left = margin;
    }
    if (top < margin) {
      top = margin;
    }

    setPosition({ top, left });
  }, [menu.x, menu.y, menu.text, menu.mode, menu.scope, menuCategories.length, occurrenceCount]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="entity-menu-backdrop" onClick={onClose} role="presentation">
      <section
        className="entity-menu"
        ref={menuRef}
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-label={menu.mode === "add" ? "Add entity" : "Remove entity"}
        onClick={(event) => event.stopPropagation()}
      >
        {menu.mode === "add" ? (
          <>
            <p className="entity-menu-title">Add entity</p>
            <p className="entity-menu-selection">"{menu.text}"</p>
            {occurrenceCount > 1 ? (
              <>
                <div className="entity-menu-scope" role="radiogroup" aria-label="Occurrence scope">
                  <button
                    className={`entity-menu-scope-option ${scope === "all" ? "active" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={scope === "all"}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onScopeChange("all")}
                  >
                    All word matches ({occurrenceCount})
                  </button>
                  <button
                    className={`entity-menu-scope-option ${scope === "single" ? "active" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={scope === "single"}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onScopeChange("single")}
                  >
                    This selection only
                  </button>
                </div>
                <p className="entity-menu-hint">
                  Word matches are whole words/phrases, case-insensitive.
                </p>
              </>
            ) : (
              <p className="entity-menu-hint">1 whole-word match in this document.</p>
            )}
            <div className="entity-menu-columns">
              <div className="entity-menu-main">
                <p className="entity-menu-section-label">Categories</p>
                <div className="entity-menu-actions">
                  {menuCategories.map(([category, label]) => (
                    <button
                      key={category}
                      className={`entity-menu-chip ${getCategoryChipClass(category)}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onAdd(category)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <aside className="entity-menu-new-category-panel">
                <p className="entity-menu-section-label">New category</p>
                <input
                  className="entity-menu-new-category-input"
                  type="text"
                  value={newCategoryName}
                  placeholder="e.g. Profession"
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && newCategoryName.trim()) {
                      event.preventDefault();
                      onAddCustom(newCategoryName);
                    }
                  }}
                />
                <button
                  className="entity-menu-new-category-submit"
                  type="button"
                  disabled={!newCategoryName.trim()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onAddCustom(newCategoryName)}
                >
                  Create & add
                </button>
              </aside>
            </div>
          </>
        ) : menu.entity ? (
          <>
            <p className="entity-menu-title">
              {categoryLabels[menu.entity.label] || formatCategoryDisplayName(menu.entity.label)}
            </p>
            <p className="entity-menu-selection">"{menu.entity.text}"</p>
            <p className="entity-menu-hint">Remove this detected span from the review.</p>
            <button className="entity-menu-danger" type="button" onClick={onRemove}>
              Remove entity
            </button>
          </>
        ) : null}
        <button className="secondary entity-menu-cancel" type="button" onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  );
}

function HighlightedText({
  text,
  segments,
  categoryLabels,
  selectedCategories,
  excludedEntityKeys,
  onAddSelection,
  onEntityClick,
}) {
  const containerRef = useRef(null);

  if (!text) {
    return <div className="empty-state">Paste text and run detection to highlight entities.</div>;
  }

  const displaySegments =
    segments.length > 0 ? segments : [{ text, start: 0, end: text.length }];

  function handleMouseUp(event) {
    if (event.target.closest(".highlight")) return;

    const container = containerRef.current;
    const selection = getSelectionOffsets(container, text);
    if (!selection || !selection.text.trim()) return;

    onAddSelection({
      ...selection,
      x: event.clientX,
      y: event.clientY,
    });
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div
      className="highlighted-text interactive-highlight"
      ref={containerRef}
      onMouseUp={handleMouseUp}
    >
      {displaySegments.map((segment, index) =>
        segment.entity ? (
          <mark
            className={`highlight ${getCategoryHighlightClass(segment.entity.label)} ${isEntityActive(segment.entity, selectedCategories, excludedEntityKeys)
              ? "selected"
              : "ignored"
              }`}
            data-start={segment.start}
            data-end={segment.end}
            title={`${categoryLabels[segment.entity.label] || segment.entity.label}: click to remove`}
            key={`${segment.entity.id || segment.start}-${index}`}
            onClick={(event) => {
              event.stopPropagation();
              onEntityClick(segment.entity, { x: event.clientX, y: event.clientY });
            }}
          >
            {segment.text}
          </mark>
        ) : (
          <span data-start={segment.start} data-end={segment.end} key={`plain-${segment.start}-${index}`}>
            {segment.text}
          </span>
        ),
      )}
    </div>
  );
}

function splitEntitiesAtNewlines(sourceText, entities) {
  const expanded = [];

  for (const entity of entities) {
    const start = entity.start;
    const end = entity.end;
    if (!sourceText || start >= end || end > sourceText.length) {
      expanded.push(entity);
      continue;
    }

    let chunkStart = start;
    let split = false;

    for (let index = start; index < end; index += 1) {
      if (sourceText[index] !== "\n") {
        continue;
      }

      split = true;
      const piece = sourceText.slice(chunkStart, index);
      if (piece.trim()) {
        expanded.push({
          ...entity,
          start: chunkStart,
          end: index,
          text: piece,
        });
      }
      chunkStart = index + 1;
    }

    if (!split) {
      expanded.push(entity);
      continue;
    }

    if (chunkStart < end) {
      const piece = sourceText.slice(chunkStart, end);
      if (piece.trim()) {
        expanded.push({
          ...entity,
          start: chunkStart,
          end,
          text: piece,
        });
      }
    }
  }

  return expanded;
}

function normalizeEntities(entities, sourceText) {
  const split = sourceText ? splitEntitiesAtNewlines(sourceText, entities) : entities;

  return split
    .map((entity, index) => ({
      ...entity,
      id: entity.id || `ent-${entity.start}-${entity.end}-${index}`,
      key: `${entity.label}:${entity.text.toLocaleLowerCase()}:${entity.start}:${index}`,
    }))
    .filter((entity) => entity.text && entity.start < entity.end)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function addEntitySpans(entities, spans, label, sourceText) {
  if (!spans.length) {
    return entities;
  }

  const stamp = Date.now();
  const newEntities = spans.map((span, index) => ({
    id: `manual-${span.start}-${span.end}-${stamp}-${index}`,
    start: span.start,
    end: span.end,
    text: span.text,
    label,
    source: "manual",
  }));

  const filtered = entities.filter(
    (entity) =>
      !newEntities.some(
        (span) => entity.end > span.start && entity.start < span.end,
      ),
  );

  return normalizeEntities([...filtered, ...newEntities], sourceText);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWordBasedSearchPattern(searchText) {
  if (typeof searchText !== "string" || !searchText.trim()) {
    return null;
  }

  const words = searchText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return null;
  }

  return words.map(escapeRegExp).join("\\s+");
}

function findAllOccurrenceRanges(text, searchText) {
  const pattern = buildWordBasedSearchPattern(searchText);
  if (!text || !pattern) {
    return [];
  }

  const regex = new RegExp(
    `(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`,
    "giu",
  );

  const ranges = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchedText = match[0];
    ranges.push({
      start: match.index,
      end: match.index + matchedText.length,
      text: matchedText,
    });

    if (matchedText.length === 0) {
      regex.lastIndex += 1;
    }
  }

  return ranges;
}

function removeEntityById(entities, entityId) {
  return entities.filter((entity) => entity.id !== entityId);
}

function getSelectionOffsets(container, text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !container) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const start = getOffsetWithinContainer(container, range.startContainer, range.startOffset);
  const end = getOffsetWithinContainer(container, range.endContainer, range.endOffset);
  if (start === null || end === null || start >= end) {
    return null;
  }

  return {
    start,
    end,
    text: text.slice(start, end),
  };
}

function getOffsetWithinContainer(container, node, offset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let position = 0;

  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current === node) {
      return position + offset;
    }
    position += current.textContent.length;
  }

  return null;
}

function getEntityValueKey(category, entityText) {
  return `${category}:${entityText.toLocaleLowerCase()}`;
}

function isEntityActive(entity, selectedCategories, excludedEntityKeys) {
  if (!selectedCategories[entity.label]) {
    return false;
  }

  return !excludedEntityKeys[getEntityValueKey(entity.label, entity.text)];
}

function groupEntities(entities) {
  return entities.reduce((groups, entity) => {
    const category = entity.label || "misc";
    const existing = groups[category] || [];

    if (existing.some((item) => item.text.toLocaleLowerCase() === entity.text.toLocaleLowerCase())) {
      return groups;
    }

    return {
      ...groups,
      [category]: [...existing, entity],
    };
  }, {});
}

function createHighlightSegments(text, entities) {
  if (!text) return [];

  const orderedEntities = [...entities].sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );
  const segments = [];
  let cursor = 0;

  for (const entity of orderedEntities) {
    if (entity.start < cursor) continue;

    if (entity.start > cursor) {
      segments.push({
        text: text.slice(cursor, entity.start),
        start: cursor,
        end: entity.start,
      });
    }

    segments.push({
      text: text.slice(entity.start, entity.end),
      start: entity.start,
      end: entity.end,
      entity,
    });
    cursor = entity.end;
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
    });
  }

  return segments;
}

function replaceSelectedCategories(
  text,
  entities,
  groupedEntities,
  selectedCategories,
  excludedEntityKeys,
  customCategories,
) {
  const replacementMap = new Map();

  Object.entries(groupedEntities).forEach(([category, categoryEntities]) => {
    if (!selectedCategories[category]) return;

    categoryEntities.forEach((entity, index) => {
      replacementMap.set(
        getEntityValueKey(category, entity.text),
        `[${getCategoryPrefix(category, customCategories)}_${index + 1}]`,
      );
    });
  });

  let output = text;
  const applicable = entities
    .filter((entity) => isEntityActive(entity, selectedCategories, excludedEntityKeys))
    .sort((a, b) => b.start - a.start || b.end - a.end);

  for (const entity of applicable) {
    const placeholder = replacementMap.get(getEntityValueKey(entity.label, entity.text));
    if (!placeholder) continue;
    if (entity.start < 0 || entity.end > output.length || entity.start >= entity.end) continue;
    output = output.slice(0, entity.start) + placeholder + output.slice(entity.end);
  }

  return output;
}

function createAuditReport({
  text,
  entities,
  anonymizedText,
  groupedEntities,
  selectedCategories,
  excludedEntityKeys,
  modelName,
  sourceFile = null,
  nerBackend = null,
  batchMode = false,
  customCategories = {},
}) {
  const categories = Object.keys(groupedEntities);
  const selected = categories.filter((category) => selectedCategories[category]);
  const kept = categories.filter((category) => !selectedCategories[category]);
  const provenance = summarizeDocumentProvenance(entities);

  const machineSourceLines = Object.entries(provenance.machineBySource)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, count]) => `- ${formatProvenanceLabel(source)}: ${count} span${count === 1 ? "" : "s"}`);

  const customCategoryLines = Object.entries(customCategories)
    .sort(([, left], [, right]) => left.localeCompare(right))
    .map(([categoryId, label]) => {
      const spanCount = entities.filter((entity) => entity.label === categoryId).length;
      return `- ${label} (${categoryId}): ${spanCount} span${spanCount === 1 ? "" : "s"} in this document`;
    });

  const replacementSummary = categories
    .map((category) => {
      const uniqueCount = groupedEntities[category].length;
      const occurrenceCount = groupedEntities[category].reduce(
        (total, entity) => total + countEntitySpans(entities, category, entity.text),
        0,
      );
      const categorySpans = entities.filter((entity) => entity.label === category);
      const manualSpanCount = categorySpans.filter(isManualEntity).length;
      const machineSpanCount = categorySpans.length - manualSpanCount;
      const activeCount = groupedEntities[category].filter((entity) =>
        isEntityActive(entity, selectedCategories, excludedEntityKeys),
      ).length;
      const status = !selectedCategories[category]
        ? "kept unchanged"
        : activeCount === uniqueCount
          ? "replaced"
          : `${activeCount} of ${uniqueCount} value(s) replaced`;

      return `- ${getCategoryLabel(category, customCategories)}: ${uniqueCount} unique value(s), ${occurrenceCount} span(s) (${machineSpanCount} automatic, ${manualSpanCount} manual), ${status}`;
    })
    .join("\n");

  const automaticReplacements = [];
  const manualReplacements = [];
  const mixedReplacements = [];
  const excludedValues = [];

  categories.forEach((category) => {
    groupedEntities[category].forEach((entity, index) => {
      const replacement = selectedCategories[category]
        ? `[${getCategoryPrefix(category, customCategories)}_${index + 1}]`
        : null;
      const spanProvenance = summarizeSpanProvenance(entities, category, entity.text);
      const occurrences = spanProvenance.spans.length;
      const active = isEntityActive(entity, selectedCategories, excludedEntityKeys);
      const line = formatValueDecisionLine({
        category,
        customCategories,
        value: entity.text,
        replacement,
        occurrences,
        provenance: spanProvenance,
        status: active && replacement ? "replaced" : "excluded",
      });

      if (!active || !replacement) {
        if (selectedCategories[category]) {
          excludedValues.push(line);
        }
        return;
      }

      if (spanProvenance.manualSpans.length && spanProvenance.machineSpans.length) {
        mixedReplacements.push(line);
      } else if (spanProvenance.manualSpans.length) {
        manualReplacements.push(line);
      } else {
        automaticReplacements.push(line);
      }
    });
  });

  const formatSection = (lines, fallback) => lines.join("\n") || fallback;
  const spanIndexLines = formatSpanIndexLines(
    entities,
    selectedCategories,
    excludedEntityKeys,
    customCategories,
  );

  return `# Anonymization Audit Report

Generated: ${new Date().toLocaleString()}
Tool: Incognito${batchMode ? " batch review" : ""}
NER engine: ${modelName || "Not run"}${nerBackend ? ` (${nerBackend})` : ""}
${sourceFile ? `Source file: ${sourceFile}` : ""}

## Document Summary
- Source characters: ${text.length}
- Anonymized characters: ${anonymizedText.length}
- Entity categories in review: ${categories.length}
- Categories selected for replacement: ${selected.length}
- Categories kept unchanged: ${kept.length}
- Total annotated spans: ${provenance.manualSpans.length + provenance.machineSpans.length}
- Character positions use 0-based indexing; each span is reported as \`start–end\` where \`start\` is inclusive and \`end\` is exclusive (same convention as JavaScript string slices).

## Provenance Summary
This report distinguishes automatic NER detections from spans added or revised during human review.

- Automatic detection spans: ${provenance.machineSpans.length}
- Human manual review spans: ${provenance.manualSpans.length}
- Unique values with automatic spans only: ${provenance.machineOnlyValues}
- Unique values with manual spans only: ${provenance.manualOnlyValues}
- Unique values with mixed automatic + manual spans: ${provenance.mixedValues}

### Automatic Detection Breakdown
${formatSection(machineSourceLines, "- No automatic spans in the final review")}

### Human Review Notes
- Manual spans are tagged \`source: manual\` in the annotation data.
- Values toggled off during review remain listed under "Values excluded from anonymization".
${customCategoryLines.length ? `- Custom categories defined during review:\n${customCategoryLines.join("\n")}` : "- Custom categories defined during review: none"}

## Category Decisions
${replacementSummary || "- No entities detected"}

## Automatic Detections — Values Replaced
${formatSection(automaticReplacements, "- None")}

## Human Manual Additions — Values Replaced
${formatSection(manualReplacements, "- None")}

## Mixed Origin — Values Replaced
Values below contain both automatic detections and manual review spans for the same category/value.
${formatSection(mixedReplacements, "- None")}

## Values Excluded from Anonymization
These values were detected or added during review but toggled off for replacement.
${formatSection(excludedValues, "- None")}

## Complete Span Index
All annotated spans in source order with exact character positions.
${formatSection(spanIndexLines, "- None")}

## Replacement Method
Selected entity categories were replaced with stable category placeholders, for example [PERSON_1], [LOCATION_1], [DATE_1], and [EMAIL_1]. Replacements are applied consistently for each unique value within the current text. Each line above records span counts, character offsets, and whether spans came from automatic detection or human manual review.

## Categories Replaced
${selected.map((category) => `- ${getCategoryLabel(category, customCategories)}`).join("\n") || "- None"}

## Categories Kept Unchanged
${kept.map((category) => `- ${getCategoryLabel(category, customCategories)}`).join("\n") || "- None"}

## Privacy Note
This report includes raw detected values selected for replacement so the anonymization process can be audited. Treat the report as sensitive research data and store or share it with the same care as the source document.

## Research Caveat
This tool is an anonymization assistant. Researchers should manually review the anonymized text for indirect identifiers, rare contextual details, and model detection errors before sharing or archiving data.
`;
}

function countEntitySpans(entities, category, value) {
  const normalized = value.toLocaleLowerCase();
  return entities.filter(
    (entity) =>
      entity.label === category && entity.text.toLocaleLowerCase() === normalized,
  ).length;
}

function countOccurrences(text, value) {
  return findAllOccurrenceRanges(text, value).length;
}

function downloadFile(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
