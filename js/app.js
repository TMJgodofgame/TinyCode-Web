import {
    MAX_SOURCE_SIZE,
    convert,
    createStandaloneDocument,
    detectLanguage,
    languages,
} from './core.js';

const byId = (id) => document.getElementById(id);

const ui = {
    fileInput: byId('file-input'),
    openFile: byId('open-file'),
    pasteCode: byId('paste-code'),
    clearCode: byId('clear-code'),
    fileLabel: byId('file-label'),
    language: byId('language'),
    theme: byId('theme'),
    fontSize: byId('font-size'),
    lineNumbers: byId('line-numbers'),
    source: byId('source-code'),
    sourceStats: byId('source-stats'),
    dropZone: byId('drop-zone'),
    previewTab: byId('preview-tab'),
    htmlTab: byId('html-tab'),
    previewPanel: byId('preview-panel'),
    htmlPanel: byId('html-panel'),
    previewTools: byId('preview-tools'),
    previewHost: byId('preview-host'),
    previewSmaller: byId('preview-smaller'),
    previewLarger: byId('preview-larger'),
    previewReading: byId('preview-reading'),
    htmlOutput: byId('html-output'),
    resultLanguage: byId('result-language'),
    convertCopy: byId('convert-copy'),
    copyHtml: byId('copy-html'),
    downloadHtml: byId('download-html'),
    openPreview: byId('open-preview'),
    status: byId('status'),
    statusText: byId('status-text'),
};

const state = {
    filename: '',
    result: null,
    readingResult: null,
    resultOptions: null,
    stale: false,
    busy: false,
    previewFontSize: 14,
    previewReading: false,
    dragDepth: 0,
};

const setStatus = (message, kind = 'info') => {
    ui.statusText.textContent = message;
    if (kind === 'info') {
        delete ui.status.dataset.kind;
    } else {
        ui.status.dataset.kind = kind;
    }
};

const setResultActions = (enabled) => {
    ui.copyHtml.disabled = !enabled;
    ui.downloadHtml.disabled = !enabled;
    ui.openPreview.disabled = !enabled;
};

const setBusy = (busy) => {
    state.busy = busy;
    ui.convertCopy.disabled = busy;
    ui.openFile.disabled = busy;
    ui.convertCopy.classList.toggle('is-busy', busy);
    ui.convertCopy.setAttribute('aria-busy', String(busy));
};

const sourceLineCount = (source) => source ? source.split(/\r\n|\r|\n/).length : 0;

const updateSourceStats = () => {
    const source = ui.source.value;
    const lines = sourceLineCount(source);
    ui.sourceStats.textContent = `${lines} ${lines === 1 ? 'línea' : 'líneas'} · ${source.length.toLocaleString('es-ES')} caracteres`;
};

const markChanged = () => {
    if (!state.result || state.busy) {
        return;
    }
    state.stale = true;
    setResultActions(false);
    setStatus('Hay cambios pendientes. Vuelve a convertir para actualizar el resultado.', 'warning');
};

const handleEditorTab = (event) => {
    if (event.key !== 'Tab') {
        return;
    }
    event.preventDefault();
    const editor = event.currentTarget;
    const {selectionStart: start, selectionEnd: end, value} = editor;

    if (!event.shiftKey && start === end) {
        editor.setRangeText('\t', start, end, 'end');
    } else if (event.shiftKey && start === end) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const indentation = /^(?:\t| {1,4})/.exec(value.slice(lineStart))?.[0] || '';
        if (indentation && start >= lineStart + indentation.length) {
            editor.setRangeText('', lineStart, lineStart + indentation.length, 'start');
            const caret = Math.max(lineStart, start - indentation.length);
            editor.setSelectionRange(caret, caret);
        }
    } else {
        const blockStart = value.lastIndexOf('\n', start - 1) + 1;
        let blockEnd = value.indexOf('\n', end);
        if (blockEnd === -1) {
            blockEnd = value.length;
        }
        const block = value.slice(blockStart, blockEnd);
        const replacement = event.shiftKey
            ? block.replace(/^(?:\t| {1,4})/gm, '')
            : block.replace(/^/gm, '\t');
        editor.setRangeText(replacement, blockStart, blockEnd, 'select');
    }
    editor.dispatchEvent(new Event('input', {bubbles: true}));
};

const populateLanguages = () => {
    ui.language.append(new Option('Automático', 'auto'));
    for (const [name, profile] of Object.entries(languages)) {
        ui.language.append(new Option(profile.label, name));
    }
};

const activateTab = (name) => {
    const preview = name === 'preview';
    ui.previewTab.classList.toggle('is-active', preview);
    ui.htmlTab.classList.toggle('is-active', !preview);
    ui.previewTab.setAttribute('aria-selected', String(preview));
    ui.htmlTab.setAttribute('aria-selected', String(!preview));
    ui.previewTab.tabIndex = preview ? 0 : -1;
    ui.htmlTab.tabIndex = preview ? -1 : 0;
    ui.previewPanel.hidden = !preview;
    ui.htmlPanel.hidden = preview;
};

const applyPreviewFontSize = () => {
    const codeblock = ui.previewHost.querySelector('pre.codeblock');
    const gutter = ui.previewHost.querySelector('pre[data-codeblock-gutter]');
    if (codeblock) {
        codeblock.style.fontSize = `${state.previewFontSize}px`;
    }
    if (gutter) {
        gutter.style.fontSize = `${state.previewFontSize}px`;
    }
};

const setPreviewReading = (active) => {
    if (!state.result || !state.readingResult) {
        return;
    }
    state.previewReading = active;
    ui.previewHost.innerHTML = active ? state.readingResult.fragment : state.result.fragment;
    ui.previewReading.textContent = active ? 'Ver código original' : 'Ayuda para leer';
    ui.previewReading.title = ui.previewReading.textContent;
    ui.previewReading.setAttribute('aria-label', ui.previewReading.textContent);
    ui.previewReading.setAttribute('aria-pressed', String(active));
    applyPreviewFontSize();
};

const showResult = () => {
    ui.htmlOutput.value = state.result.fragment;
    ui.resultLanguage.textContent = languages[state.result.language].label;
    ui.resultLanguage.hidden = false;
    ui.previewTools.hidden = false;
    state.previewFontSize = Number(state.resultOptions.fontSize);
    state.previewReading = false;
    setPreviewReading(false);
    activateTab('preview');
    setResultActions(true);
};

const fallbackCopy = (text) => {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.inset = '-1000px auto auto -1000px';
    document.body.appendChild(helper);
    helper.select();
    let copied = false;
    try {
        copied = document.execCommand('copy');
    } finally {
        helper.remove();
    }
    return copied;
};

const copyText = async (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Some browsers deny the modern API but still allow a user-triggered fallback.
        }
    }
    return fallbackCopy(text);
};

const currentOptions = () => ({
    language: ui.language.value,
    filename: state.filename,
    reading: false,
    numbers: ui.lineNumbers.checked,
    theme: ui.theme.value,
    fontSize: Number(ui.fontSize.value),
});

const waitForPaint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

const generate = async ({copy = true} = {}) => {
    if (state.busy) {
        return;
    }
    setBusy(true);
    setStatus('Generando HTML…');
    await waitForPaint();
    try {
        const options = currentOptions();
        const source = ui.source.value;
        const result = convert(source, options);
        const readingResult = convert(source, {
            ...options,
            language: result.language,
            reading: true,
        });
        state.result = result;
        state.readingResult = readingResult;
        state.resultOptions = options;
        state.stale = false;
        showResult();

        const label = languages[result.language].label;
        if (copy) {
            const copied = await copyText(result.fragment);
            if (copied) {
                setStatus(`HTML copiado al portapapeles · ${label} · Listo para pegar en Moodle.`, 'success');
            } else {
                setStatus(`HTML generado · ${label}. El navegador bloqueó el portapapeles; cópialo desde “HTML para pegar”.`, 'warning');
            }
        } else {
            setStatus(`HTML generado · ${label} · ${result.lineCount} líneas.`, 'success');
        }
    } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), 'error');
    } finally {
        setBusy(false);
    }
};

const copyGeneratedHtml = async () => {
    if (!state.result || state.stale) {
        return;
    }
    const copied = await copyText(state.result.fragment);
    setStatus(copied
        ? 'HTML copiado. Pégalo en la vista HTML (<>) de Moodle.'
        : 'No se pudo copiar automáticamente. Usa la pestaña “HTML para pegar”.', copied ? 'success' : 'warning');
};

const decodeFile = async (file) => {
    if (file.size > MAX_SOURCE_SIZE) {
        throw new Error('El archivo supera los 2 MB. Selecciona un fragmento más pequeño.');
    }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let text;
    let encoding;

    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        text = new TextDecoder('utf-16le').decode(buffer);
        encoding = 'UTF-16 LE';
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        text = new TextDecoder('utf-16be').decode(buffer);
        encoding = 'UTF-16 BE';
    } else {
        if (bytes.includes(0)) {
            throw new Error('El archivo parece binario. Elige un archivo de código o texto.');
        }
        try {
            text = new TextDecoder('utf-8', {fatal: true}).decode(buffer);
            encoding = 'UTF-8';
        } catch {
            text = new TextDecoder('windows-1252').decode(buffer);
            encoding = 'Windows-1252';
        }
    }
    return {text: text.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n'), encoding};
};

const loadFile = async (file) => {
    if (!file) {
        return;
    }
    try {
        const {text, encoding} = await decodeFile(file);
        state.filename = file.name;
        ui.source.value = text;
        ui.fileLabel.textContent = file.name;
        ui.fileLabel.title = file.name;
        ui.language.value = detectLanguage(text, file.name);
        updateSourceStats();
        markChanged();
        setStatus(`Archivo abierto: ${file.name} · ${encoding}`, 'success');
        ui.source.focus();
    } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), 'error');
    } finally {
        ui.fileInput.value = '';
    }
};

const pasteFromClipboard = async () => {
    try {
        if (!navigator.clipboard?.readText) {
            throw new Error('El navegador no permite leer el portapapeles aquí.');
        }
        const text = await navigator.clipboard.readText();
        if (!text) {
            throw new Error('El portapapeles no contiene texto.');
        }
        state.filename = '';
        ui.source.value = text.replace(/\r\n|\r/g, '\n');
        ui.fileLabel.textContent = 'Código pegado';
        ui.fileLabel.removeAttribute('title');
        ui.language.value = 'auto';
        updateSourceStats();
        markChanged();
        setStatus('Código pegado. Elige un lenguaje o deja la detección automática.', 'success');
        ui.source.focus();
    } catch (error) {
        ui.source.focus();
        setStatus(`${error instanceof Error ? error.message : String(error)} Haz clic en el editor y pulsa Ctrl+V.`, 'warning');
    }
};

const clearSource = () => {
    if (!ui.source.value || window.confirm('¿Quieres borrar todo el código del editor?')) {
        state.filename = '';
        ui.source.value = '';
        ui.fileLabel.textContent = 'Código escrito o pegado';
        ui.fileLabel.removeAttribute('title');
        ui.language.value = 'auto';
        updateSourceStats();
        markChanged();
        setStatus('Editor vacío. Escribe, pega o abre un archivo para continuar.');
        ui.source.focus();
    }
};

const downloadName = () => {
    const base = (state.filename || 'codigo-moodle').replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'codigo-moodle';
    return `${base}-interactivo.html`;
};

const standaloneDocument = () => createStandaloneDocument(
    state.result.fragment,
    state.readingResult.fragment,
    `Código para Moodle · ${languages[state.result.language].label}`,
);

const downloadStandalone = () => {
    if (!state.result || state.stale) {
        return;
    }
    const url = URL.createObjectURL(new Blob([standaloneDocument()], {type: 'text/html;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setStatus(`HTML interactivo descargado: ${link.download}`, 'success');
};

const openStandalone = () => {
    if (!state.result || state.stale) {
        return;
    }
    const url = URL.createObjectURL(new Blob([standaloneDocument()], {type: 'text/html;charset=utf-8'}));
    const opened = window.open(url, '_blank');
    if (opened) {
        opened.opener = null;
        setStatus('Vista interactiva abierta en una pestaña nueva.', 'success');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } else {
        URL.revokeObjectURL(url);
        setStatus('El navegador bloqueó la pestaña nueva. Permite ventanas emergentes para esta página.', 'warning');
    }
};

const handleDrop = (event) => {
    event.preventDefault();
    state.dragDepth = 0;
    ui.dropZone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        loadFile(file);
    }
};

populateLanguages();
updateSourceStats();
activateTab('preview');
setResultActions(false);

ui.openFile.addEventListener('click', () => ui.fileInput.click());
ui.fileInput.addEventListener('change', () => loadFile(ui.fileInput.files?.[0]));
ui.pasteCode.addEventListener('click', pasteFromClipboard);
ui.clearCode.addEventListener('click', clearSource);
ui.convertCopy.addEventListener('click', () => generate({copy: true}));
ui.copyHtml.addEventListener('click', copyGeneratedHtml);
ui.downloadHtml.addEventListener('click', downloadStandalone);
ui.openPreview.addEventListener('click', openStandalone);
ui.previewTab.addEventListener('click', () => activateTab('preview'));
ui.htmlTab.addEventListener('click', () => activateTab('html'));
ui.previewSmaller.addEventListener('click', () => {
    state.previewFontSize = Math.max(12, state.previewFontSize - 2);
    applyPreviewFontSize();
});
ui.previewLarger.addEventListener('click', () => {
    state.previewFontSize = Math.min(28, state.previewFontSize + 2);
    applyPreviewFontSize();
});
ui.previewReading.addEventListener('click', () => setPreviewReading(!state.previewReading));

ui.source.addEventListener('input', () => {
    updateSourceStats();
    markChanged();
});
ui.source.addEventListener('keydown', handleEditorTab);

for (const control of [ui.language, ui.theme, ui.fontSize, ui.lineNumbers]) {
    control.addEventListener('change', markChanged);
}

for (const tab of [ui.previewTab, ui.htmlTab]) {
    tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
        }
        event.preventDefault();
        const target = tab === ui.previewTab ? ui.htmlTab : ui.previewTab;
        activateTab(target === ui.previewTab ? 'preview' : 'html');
        target.focus();
    });
}

ui.dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    state.dragDepth += 1;
    ui.dropZone.classList.add('is-dragging');
});
ui.dropZone.addEventListener('dragover', (event) => event.preventDefault());
ui.dropZone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    state.dragDepth = Math.max(0, state.dragDepth - 1);
    if (!state.dragDepth) {
        ui.dropZone.classList.remove('is-dragging');
    }
});
ui.dropZone.addEventListener('drop', handleDrop);

window.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
        return;
    }
    if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        ui.fileInput.click();
    } else if (event.key === 'Enter') {
        event.preventDefault();
        generate({copy: true});
    }
});

if (!globalThis.hljs) {
    ui.convertCopy.disabled = true;
    setStatus('No se pudo cargar Highlight.js. Comprueba que la carpeta vendor está junto a la aplicación.', 'error');
} else {
    document.documentElement.dataset.appReady = 'true';
    ui.source.focus();
}
