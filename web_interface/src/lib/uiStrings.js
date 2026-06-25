export const UI_LOCALES = ["en", "fr"];

const en = {
  privacyPromise:
    "Everything runs locally — your data never leaves your computer.",
  privacyDetailsLink: "Details here",
  privacyAsideBody:
    "Your interviews and field notes are worked on here, on your machine — not on a remote server. The only connection to the internet is a one-time download of the detection tool; your documents are never uploaded.",
  heroTagline: "Privacy-first text anonymization in your browser",
  heroStep1: "Detect named entities in your text",
  heroStep2: "Review the identified occurrences",
  heroStep3: "Generate an anonymized audit report",
  creditsDeveloped: "Developed by",
  creditsRole: "Digital Humanities Engineer",
  creditsDesktop: "Need spaCy, offline installers? See the",
  creditsDesktopApp: "Incognito desktop app",
  creditsReleases: "download releases",
  languageSwitchToFr: "Switch interface to French",
  languageSwitchToEn: "Switch interface to English",
  languageToggleHintFr: "Switch to French",
  languageToggleHintEn: "Switch to English",
  demoModelLabel: "Sample demo (preloaded)",
  demoPanelHint:
    "explore review tools; run detection on your own text when ready",
  statusDemoInitial:
    "Sample interview pre-loaded — explore the review panel below. Run Anonymization on your own text when ready (first run downloads the model).",
  statusDemoRestored:
    "Sample demo restored — explore category toggles, exclusions, and manual edits.",
  sampleDemoBanner:
    "This interview is already annotated so you can explore category toggles, exclusions, manual edits, and exports — no model download needed yet. Paste your own text or click Run Anonymization when you are ready (first run downloads the detection model).",
  sampleDemoBannerTitle: "Sample demo loaded.",
  loadSampleDemo: "Load sample demo",
  nerModel: "NER model",
  modelId: "Model id",
  runAnonymization: "Run Anonymization",
  anonymizing: "Anonymizing...",
  copyAnonymized: "Copy anonymized text",
  showAuditReport: "Show audit report",
  exportLabelStudio: "Export to Label Studio",
  buildingZip: "Building ZIP...",
  exportAnonymizedData: "Export anonymized data",
  previousFile: "Previous file",
  nextFile: "Next file",
  closeBatch: "Close batch",
  clear: "Clear",
  batchProcessing: "Batch processing",
  batchDescription:
    "Anonymize several qualitative documents in one session. Load a whole folder or pick specific .txt / .docx files, run named-entity detection, review and correct each text interactively, then download a ZIP with anonymized versions, audit reports, and Label Studio exports.",
  chooseFolder: "Choose folder",
  chooseFiles: "Choose files…",
  loading: "Loading…",
  goToFileNumber: "Go to file #",
  goToFileName: "Go to file name",
  fileNamePlaceholder: "File name",
  jump: "Jump",
  batchGo: "Go",
  autoRunNer: "Auto-run default model when opening an unprocessed file",
  autoRunNerHint: "Uses {model} for files without saved detections.",
  batchOutputNote:
    "ZIP contents per file: *-anonymized.txt, *-report.md, and *-label-studio.json, plus shared label-studio-ner-config.xml. Files you leave during navigation are marked with a _modified suffix in the archive.",
  errorTitle: "Something went wrong",
  errorHint:
    "Ensure you have a network connection for the first model download. Weights are cached in the browser afterward. If detection keeps failing, try reloading the page or switching to a CamemBERT model.",
  panel1Batch: "1. Source Text",
  panel1Single: "1. Paste Text",
  characters: "{count} characters",
  textPlaceholder: "Paste interview transcript or field notes here...",
  panel2Title: "2. Replace Categories?",
  modelLine: "Model: {model} ({backend}) · click entities to toggle",
  backendLine: "Backend: {backend}",
  panel3Title: "3. Highlighted Entities",
  panel3Hint:
    "{count} spans · select text to add (all word matches by default) · click highlight to remove",
  panel4Title: "4. Anonymized Preview",
  panel4Subtitle: "Selected categories only",
  panel4Empty: "Run detection to preview replacements.",
  categoryEmpty:
    "Run anonymization or add entities manually in the highlighted view below.",
  replaceCategory: "Replace",
  uniqueValues: "{count} unique value(s)",
  categoryHint: "Click an entity to toggle all of its occurrences in the output.",
  chipKeep: "Click to keep this value unchanged in the output",
  chipInclude: "Click to include this value in anonymization again",
  installTitle: "Install Incognito",
  installBody:
    "Add a desktop shortcut that opens this app in its own window — no binary download, same privacy-first text anonymization.",
  installButton: "Install app",
  installHintTitle: "Install as an app",
  installHintBody:
    "In Chrome or Edge: menu → Install Incognito / Apps → Install this site. On macOS you can keep it in the Dock like a native app.",
  auditEyebrow: "Research documentation",
  auditTitle: "Audit Report",
  auditCopy: "Copy report",
  auditDownload: "Download .md",
  close: "Close",
  downloadingModel: "Downloading model",
  modelProgressNote: "ONNX weights are cached in your browser after the first run.",
  batchLoading: "Loading documents",
  batchDetecting: "Detecting entities in batch",
  batchProcessingGeneric: "Processing batch",
  batchPreparing: "Preparing your selected documents…",
  batchProcessingFile: "Processing: {name}",
  batchFinishedFile: "Finished: {name}",
  batchFileProgress: "Processing file {current} of {total}",
  batchFileComplete: "Completed {total} of {total}",
  batchModeClosed: "Batch mode closed. Restored the sample demo.",
  sessionCleared: "Session cleared.",
  privacy: {
    eyebrow: "Confidentiality",
    title: "How Incognito protects your research material",
    intro:
      "Incognito was built for qualitative work — interviews, field notes, open survey responses, project documents. In short: your texts are read and processed on your own computer, not sent to a cloud service for analysis.",
    sections: [
      {
        heading: "Your corpus stays with you",
        bullets: [
          "Whether you paste a transcript, open a file, or work through a folder of documents, the content remains on this machine.",
          "We do not receive your source texts, your anonymized versions, or the list of names and places you choose to replace.",
          "When you export results — anonymized text, audit report, or files for Label Studio — you decide where to save them, as with any file you download.",
        ],
      },
      {
        heading: "Review happens on your computer",
        bullets: [
          "Detection of people, places, organisations, dates, and similar elements runs locally, in the same way as software installed on your laptop.",
          "You keep full control: you can accept, refuse, or correct each suggestion before anything is replaced.",
          "The sample interview loaded when you open the app is already prepared so you can try the review steps without connecting your own material to the internet.",
        ],
      },
      {
        heading: "When the internet is used",
        bullets: [
          "The first time you run anonymization on your own text, the app may download a language-detection tool (a one-off file, roughly the size of a large document). Your transcripts are not part of that download.",
          "Once that file is saved in your browser, you can usually continue working even without a connection.",
          "If you install Incognito as an app on your desktop or Dock, the same rule applies — it is still your computer doing the work.",
        ],
      },
      {
        heading: "What we never see",
        bullets: [
          "The content of your interviews or field notes",
          "The names, places, and organisations you mark for replacement",
          "Your manual corrections or the audit trail you generate",
          "The names of files or folders you open in batch mode",
        ],
      },
      {
        heading: "About the public website",
        paragraphs: [
          "The online version at xiaoouwang.github.io/Incognito may count anonymous visits (how many people opened the page). That statistic does not include your texts or your anonymization choices.",
        ],
      },
      {
        heading: "A note of caution",
        paragraphs: [
          "Incognito helps you prepare material for sharing or archiving — it does not replace a careful final read-through. Some identifying details can be missed or misclassified. Before you publish, deposit, or circulate a corpus, always review the output yourself (and treat the audit report with the same confidentiality as the original source).",
        ],
      },
      {
        heading: "Open source — you can check for yourself",
        paragraphs: [
          "Incognito is free and open source. The full programme — web and desktop versions — is published on GitHub under an AGPL licence, which means anyone can read, study, and share the code.",
        ],
        bullets: [
          "Your research lab, university IT service, or a trusted colleague can inspect the source and confirm that your material is not sent elsewhere.",
          "There are no hidden components designed to extract your corpus; what you see described here is what the published code does.",
          "If you are preparing a data-management plan or ethics file, you can point reviewers to the repository as evidence of how processing stays local.",
        ],
        linkLabel: "Browse the code on GitHub — xiaoouwang/Incognito",
      },
    ],
    footnote:
      "A desktop version is also available; it follows the same principles — local processing, no upload of your corpus.",
  },
};

const fr = {
  privacyPromise:
    "Tout s'exécute localement — vos données ne quittent pas votre ordinateur.",
  privacyDetailsLink: "Détails ici",
  privacyAsideBody:
    "Vos entretiens et notes de terrain sont traités ici, sur votre machine — pas sur un serveur distant. La seule connexion internet sert au téléchargement unique de l'outil de détection ; vos documents ne sont jamais envoyés.",
  heroTagline: "Anonymisation de textes qualitatifs, dans votre navigateur",
  heroStep1: "Détecter les entités nommées dans votre texte",
  heroStep2: "Relire les occurrences identifiées",
  heroStep3: "Générer un rapport d'audit anonymisé",
  creditsDeveloped: "Développé par",
  creditsRole: "Ingénieur en Humanités Numériques",
  creditsDesktop: "Besoin de spaCy ou d'installateurs hors ligne ? Voir",
  creditsDesktopApp: "l'application de bureau Incognito",
  creditsReleases: "télécharger les versions",
  languageSwitchToFr: "Passer l'interface en français",
  languageSwitchToEn: "Passer l'interface en anglais",
  languageToggleHintFr: "Passer en français",
  languageToggleHintEn: "Passer en anglais",
  demoModelLabel: "Démo d'exemple (préchargée)",
  demoPanelHint:
    "explorez les outils de relecture ; lancez la détection sur votre propre texte quand vous êtes prêt·e",
  statusDemoInitial:
    "Entretien d'exemple préchargé — explorez le panneau de relecture ci-dessous. Lancez l'anonymisation sur votre texte quand vous êtes prêt·e (le premier lancement télécharge le modèle).",
  statusDemoRestored:
    "Démo d'exemple restaurée — explorez les catégories, exclusions et modifications manuelles.",
  sampleDemoBanner:
    "Cet entretien est déjà annoté : vous pouvez explorer les catégories, exclusions, modifications manuelles et exports — sans télécharger de modèle pour l'instant. Collez votre propre texte ou cliquez sur Lancer l'anonymisation quand vous êtes prêt·e (le premier lancement télécharge le modèle).",
  sampleDemoBannerTitle: "Démo d'exemple chargée.",
  loadSampleDemo: "Charger la démo d'exemple",
  nerModel: "Modèle NER",
  modelId: "Identifiant du modèle",
  runAnonymization: "Lancer l'anonymisation",
  anonymizing: "Anonymisation…",
  copyAnonymized: "Copier le texte anonymisé",
  showAuditReport: "Afficher le rapport d'audit",
  exportLabelStudio: "Exporter vers Label Studio",
  buildingZip: "Création du ZIP…",
  exportAnonymizedData: "Exporter les données anonymisées",
  previousFile: "Fichier précédent",
  nextFile: "Fichier suivant",
  closeBatch: "Fermer le lot",
  clear: "Effacer",
  batchProcessing: "Traitement par lot",
  batchDescription:
    "Anonymisez plusieurs documents qualitatifs en une session. Chargez un dossier entier ou choisissez des fichiers .txt / .docx, lancez la détection d'entités, relisez et corrigez chaque texte, puis téléchargez un ZIP avec les versions anonymisées, les rapports d'audit et les exports Label Studio.",
  chooseFolder: "Choisir un dossier",
  chooseFiles: "Choisir des fichiers…",
  loading: "Chargement…",
  goToFileNumber: "Aller au fichier n°",
  goToFileName: "Aller au nom de fichier",
  fileNamePlaceholder: "Nom du fichier",
  jump: "Aller",
  batchGo: "OK",
  autoRunNer: "Lancer le modèle par défaut à l'ouverture d'un fichier non traité",
  autoRunNerHint: "Utilise {model} pour les fichiers sans détection enregistrée.",
  batchOutputNote:
    "Contenu du ZIP par fichier : *-anonymized.txt, *-report.md et *-label-studio.json, plus label-studio-ner-config.xml partagé. Les fichiers que vous quittez pendant la navigation sont marqués avec le suffixe _modified dans l'archive.",
  errorTitle: "Un problème est survenu",
  errorHint:
    "Vérifiez votre connexion internet pour le premier téléchargement du modèle. Les fichiers sont ensuite mis en cache dans le navigateur. Si la détection échoue, rechargez la page ou essayez un modèle CamemBERT.",
  panel1Batch: "1. Texte source",
  panel1Single: "1. Coller un texte",
  characters: "{count} caractères",
  textPlaceholder: "Collez un entretien, une transcription ou des notes de terrain…",
  panel2Title: "2. Remplacer les catégories ?",
  modelLine: "Modèle : {model} ({backend}) · cliquez sur les entités pour basculer",
  backendLine: "Moteur : {backend}",
  panel3Title: "3. Entités surlignées",
  panel3Hint:
    "{count} segments · sélectionnez du texte pour ajouter (toutes les occurrences par défaut) · cliquez sur un surlignage pour supprimer",
  panel4Title: "4. Aperçu anonymisé",
  panel4Subtitle: "Catégories sélectionnées uniquement",
  panel4Empty: "Lancez la détection pour prévisualiser les remplacements.",
  categoryEmpty:
    "Lancez l'anonymisation ou ajoutez des entités manuellement dans la vue surlignée ci-dessous.",
  replaceCategory: "Remplacer",
  uniqueValues: "{count} valeur(s) distincte(s)",
  categoryHint:
    "Cliquez sur une entité pour basculer toutes ses occurrences dans le résultat.",
  chipKeep: "Cliquez pour conserver cette valeur dans le texte final",
  chipInclude: "Cliquez pour inclure à nouveau cette valeur dans l'anonymisation",
  installTitle: "Installer Incognito",
  installBody:
    "Ajoutez un raccourci bureau qui ouvre l'application dans sa propre fenêtre — sans binaire à télécharger, même anonymisation respectueuse de la vie privée.",
  installButton: "Installer l'application",
  installHintTitle: "Installer comme application",
  installHintBody:
    "Dans Chrome ou Edge : menu → Installer Incognito / Applications → Installer ce site. Sur macOS, vous pouvez l'épingler au Dock comme une application native.",
  auditEyebrow: "Documentation de recherche",
  auditTitle: "Rapport d'audit",
  auditCopy: "Copier le rapport",
  auditDownload: "Télécharger .md",
  close: "Fermer",
  downloadingModel: "Téléchargement du modèle",
  modelProgressNote:
    "Les fichiers du modèle sont mis en cache dans votre navigateur après le premier lancement.",
  batchLoading: "Chargement des documents",
  batchDetecting: "Détection d'entités en lot",
  batchProcessingGeneric: "Traitement du lot",
  batchPreparing: "Préparation des documents sélectionnés…",
  batchProcessingFile: "En cours : {name}",
  batchFinishedFile: "Terminé : {name}",
  batchFileProgress: "Fichier {current} sur {total}",
  batchFileComplete: "{total} sur {total} terminé(s)",
  batchModeClosed: "Mode lot fermé. Démo d'exemple restaurée.",
  sessionCleared: "Session effacée.",
  privacy: {
    eyebrow: "Confidentialité",
    title: "Comment Incognito protège vos matériaux de recherche",
    intro:
      "Incognito a été conçu pour le travail qualitatif — entretiens, notes de terrain, réponses ouvertes, documents de projet. En bref : vos textes sont lus et traités sur votre propre ordinateur, pas envoyés vers un service d'analyse dans le cloud.",
    sections: [
      {
        heading: "Votre corpus reste avec vous",
        bullets: [
          "Que vous colliez une transcription, ouvriez un fichier ou parcouriez un dossier de documents, le contenu reste sur cette machine.",
          "Nous ne recevons ni vos textes sources, ni vos versions anonymisées, ni la liste des noms et lieux que vous choisissez de remplacer.",
          "Lorsque vous exportez des résultats — texte anonymisé, rapport d'audit ou fichiers pour Label Studio — vous décidez où les enregistrer, comme pour tout fichier téléchargé.",
        ],
      },
      {
        heading: "La relecture se fait sur votre ordinateur",
        bullets: [
          "La détection des personnes, lieux, organisations, dates et éléments similaires s'effectue localement, comme un logiciel installé sur votre ordinateur.",
          "Vous gardez le contrôle : vous pouvez accepter, refuser ou corriger chaque suggestion avant tout remplacement.",
          "L'entretien d'exemple chargé à l'ouverture est déjà préparé pour essayer les étapes de relecture sans connecter vos propres matériaux à internet.",
        ],
      },
      {
        heading: "Quand internet est utilisé",
        bullets: [
          "La première fois que vous lancez l'anonymisation sur votre propre texte, l'application peut télécharger un outil de détection linguistique (fichier unique, de taille comparable à un long document). Vos transcriptions ne font pas partie de ce téléchargement.",
          "Une fois ce fichier enregistré dans votre navigateur, vous pouvez en général continuer à travailler sans connexion.",
          "Si vous installez Incognito comme application sur le bureau ou le Dock, la règle est la même — c'est toujours votre ordinateur qui fait le travail.",
        ],
      },
      {
        heading: "Ce que nous ne voyons jamais",
        bullets: [
          "Le contenu de vos entretiens ou notes de terrain",
          "Les noms, lieux et organisations que vous marquez pour remplacement",
          "Vos corrections manuelles ou la trace d'audit que vous générez",
          "Les noms de fichiers ou de dossiers ouverts en mode lot",
        ],
      },
      {
        heading: "À propos du site public",
        paragraphs: [
          "La version en ligne sur xiaoouwang.github.io/Incognito peut compter les visites anonymes (combien de personnes ouvrent la page). Cette statistique n'inclut ni vos textes ni vos choix d'anonymisation.",
        ],
      },
      {
        heading: "Mise en garde",
        paragraphs: [
          "Incognito vous aide à préparer un matériau pour diffusion ou archivage — il ne remplace pas une relecture attentive. Certains éléments identifiants peuvent être manqués ou mal classés. Avant de publier, déposer ou circuler un corpus, relisez toujours le résultat vous-même (et traitez le rapport d'audit avec la même confidentialité que la source).",
        ],
      },
      {
        heading: "Open source — vous pouvez vérifier",
        paragraphs: [
          "Incognito est libre et open source. Le programme complet — versions web et bureau — est publié sur GitHub sous licence AGPL : chacun·e peut lire, étudier et partager le code.",
        ],
        bullets: [
          "Votre laboratoire, le service informatique de l'université ou un·e collègue de confiance peut examiner le code et confirmer que vos matériaux ne sont pas envoyés ailleurs.",
          "Il n'y a pas de composant caché conçu pour extraire votre corpus ; ce qui est décrit ici correspond au code publié.",
          "Pour un plan de gestion des données ou un dossier éthique, vous pouvez orienter les évaluateur·rice·s vers le dépôt comme preuve du traitement local.",
        ],
        linkLabel: "Voir le code sur GitHub — xiaoouwang/Incognito",
      },
    ],
    footnote:
      "Une version de bureau est aussi disponible ; elle suit les mêmes principes — traitement local, aucun envoi de votre corpus.",
  },
};

export const UI_STRINGS = { en, fr };

export function translate(locale, key, vars = {}) {
  const path = key.split(".");
  let value = UI_STRINGS[locale] ?? UI_STRINGS.en;

  for (const part of path) {
    value = value?.[part];
  }

  if (typeof value !== "string") {
    return key;
  }

  return value.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`,
  );
}
