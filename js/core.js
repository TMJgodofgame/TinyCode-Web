import {languages, normaliseLanguage} from './languages.js';
import {formatForReading} from './reading.js';

export const MAX_SOURCE_SIZE = 2_000_000;

export const THEMES = {
    Oscuro: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        muted: '#8b949e',
        border: '#30363d',
    },
    Claro: {
        background: '#f6f8fa',
        foreground: '#24292f',
        muted: '#57606a',
        border: '#d0d7de',
    },
};

const HIGHLIGHT_NAMES = {
    objectivec: 'objectivec',
    plaintext: 'plaintext',
};

const TOKEN_STYLES = {
    Oscuro: {
        comment: 'color:#8b949e;font-style:italic',
        quote: 'color:#8b949e;font-style:italic',
        keyword: 'color:#ff7b72',
        selectorTag: 'color:#7ee787',
        type: 'color:#ff7b72',
        name: 'color:#7ee787',
        tag: 'color:#7ee787',
        doctag: 'color:#ff7b72',
        string: 'color:#a5d6ff',
        regexp: 'color:#a5d6ff',
        templateTag: 'color:#a5d6ff',
        templateVariable: 'color:#ffa657',
        attribute: 'color:#79c0ff',
        attr: 'color:#79c0ff',
        property: 'color:#79c0ff',
        number: 'color:#79c0ff',
        literal: 'color:#79c0ff',
        variable: 'color:#ffa657',
        title: 'color:#d2a8ff;font-weight:600',
        function: 'color:#d2a8ff;font-weight:600',
        class: 'color:#ffa657;font-weight:600',
        section: 'color:#d2a8ff;font-weight:600',
        builtIn: 'color:#ffa657',
        builtinName: 'color:#ffa657',
        meta: 'color:#79c0ff',
        symbol: 'color:#a5d6ff',
        bullet: 'color:#f2cc60',
        link: 'color:#a5d6ff;text-decoration:underline',
        selectorId: 'color:#d2a8ff',
        selectorClass: 'color:#d2a8ff',
        selectorAttr: 'color:#79c0ff',
        selectorPseudo: 'color:#7ee787',
        addition: 'color:#aff5b4;background-color:rgba(46,160,67,.15)',
        deletion: 'color:#ffdcd7;background-color:rgba(248,81,73,.15)',
        emphasis: 'font-style:italic',
        strong: 'font-weight:bold',
    },
    Claro: {
        comment: 'color:#6e7781;font-style:italic',
        quote: 'color:#6e7781;font-style:italic',
        keyword: 'color:#cf222e',
        selectorTag: 'color:#116329',
        type: 'color:#cf222e',
        name: 'color:#116329',
        tag: 'color:#116329',
        doctag: 'color:#cf222e',
        string: 'color:#0a3069',
        regexp: 'color:#0a3069',
        templateTag: 'color:#0a3069',
        templateVariable: 'color:#953800',
        attribute: 'color:#0550ae',
        attr: 'color:#0550ae',
        property: 'color:#0550ae',
        number: 'color:#0550ae',
        literal: 'color:#0550ae',
        variable: 'color:#953800',
        title: 'color:#8250df;font-weight:600',
        function: 'color:#8250df;font-weight:600',
        class: 'color:#953800;font-weight:600',
        section: 'color:#8250df;font-weight:600',
        builtIn: 'color:#953800',
        builtinName: 'color:#953800',
        meta: 'color:#0550ae',
        symbol: 'color:#0a3069',
        bullet: 'color:#9a6700',
        link: 'color:#0a3069;text-decoration:underline',
        selectorId: 'color:#8250df',
        selectorClass: 'color:#8250df',
        selectorAttr: 'color:#0550ae',
        selectorPseudo: 'color:#116329',
        addition: 'color:#1a7f37;background-color:#dafbe1',
        deletion: 'color:#cf222e;background-color:#ffebe9',
        emphasis: 'font-style:italic',
        strong: 'font-weight:bold',
    },
};

const classKey = (name) => name
    .replace(/^hljs-/, '')
    .replace(/_$/, '')
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const highlighter = () => {
    if (!globalThis.hljs) {
        throw new Error('No se ha podido cargar el motor de resaltado. Recarga la página.');
    }
    return globalThis.hljs;
};

const highlightName = (language) => HIGHLIGHT_NAMES[language] || languages[language]?.lexer || language;

const inlineTokenStyles = (markup, theme) => markup.replace(/<span class="([^"]+)">/g, (_, classNames) => {
    const declarations = [];
    for (const className of classNames.split(/\s+/)) {
        const style = TOKEN_STYLES[theme][classKey(className)];
        if (style) {
            declarations.push(...style.split(';'));
        }
    }
    const unique = [...new Set(declarations.filter(Boolean))];
    return unique.length ? `<span style="${unique.join(';')}">` : '<span>';
});

const highlightedHtml = (source, language, theme) => {
    if (language === 'plaintext') {
        return escapeHtml(source);
    }
    try {
        const markup = highlighter().highlight(source, {
            language: highlightName(language),
            ignoreIllegals: true,
        }).value;
        return inlineTokenStyles(markup, theme);
    } catch {
        return escapeHtml(source);
    }
};

export const normaliseLanguageName = (name) => {
    const key = normaliseLanguage(String(name || '').trim().toLowerCase());
    if (!languages[key]) {
        throw new Error(`Lenguaje no admitido: ${name}`);
    }
    return key;
};

export const detectLanguage = (source, filename = '') => {
    const lowerFilename = String(filename).toLowerCase();
    const extensionMatch = /(?:^|[\\/])?[^\\/]+(\.[^.\\/]+)$/.exec(lowerFilename);
    const extension = extensionMatch?.[1] || '';
    if (extension) {
        for (const [name, profile] of Object.entries(languages)) {
            if (name !== 'plaintext' && profile.extensions.some((item) => item.toLowerCase() === extension)) {
                return name;
            }
        }
    }

    if (/<\?php|\$\w+\s*->/.test(source)) {
        return 'php';
    }
    if (/^\s*(?:async\s+)?def\s+\w+/m.test(source) || /^\s*(?:from\s+\S+\s+)?import\s+[\w., ]+/m.test(source)) {
        return 'python';
    }
    if (/\b(?:const|let|function)\b|=>/.test(source)) {
        return 'javascript';
    }
    if (/^\s*(?:interface|type)\s+\w+[^\n]*(?:=|\{)|:\s*(?:string|number|boolean)(?:\[\])?/m.test(source)) {
        return 'typescript';
    }
    if (/^\s*(?:#include|#define)\b/m.test(source)) {
        return /\b(?:std::|cout\s*<<|class\s+\w+)/.test(source) ? 'cpp' : 'c';
    }
    if (source.trimStart().startsWith('{') || source.trimStart().startsWith('[')) {
        try {
            JSON.parse(source);
            return 'json';
        } catch {
            // Keep looking when braces belong to a programming language.
        }
    }

    try {
        const candidates = [...new Set(Object.keys(languages)
            .filter((name) => name !== 'plaintext')
            .map(highlightName)
            .filter((name) => highlighter().getLanguage(name)))];
        const guessed = highlighter().highlightAuto(source.slice(0, 50_000), candidates).language;
        const match = Object.keys(languages).find((name) => highlightName(name) === guessed);
        return match || 'plaintext';
    } catch {
        return 'plaintext';
    }
};

const countLines = (source) => source.split(/\r\n|\r|\n/).length;

export const convert = (source, {
    language = 'auto',
    filename = '',
    reading = false,
    numbers = true,
    theme = 'Oscuro',
    fontSize = 14,
} = {}) => {
    source = String(source ?? '');
    if (!source.trim()) {
        throw new Error('Escribe código o abre un archivo antes de convertir.');
    }
    if (source.length > MAX_SOURCE_SIZE) {
        throw new Error('El archivo supera los 2 MB de texto. Selecciona un fragmento más pequeño.');
    }
    if (!THEMES[theme]) {
        throw new Error('Selecciona un tema válido.');
    }
    fontSize = Number(fontSize);
    if (!Number.isFinite(fontSize) || fontSize < 10 || fontSize > 28) {
        throw new Error('Selecciona un tamaño de letra entre 10 y 28.');
    }

    const detectedLanguage = language === 'auto' ? detectLanguage(source, filename) : normaliseLanguageName(language);
    const code = reading ? formatForReading(source, detectedLanguage) : source;
    const tokenHtml = highlightedHtml(code, detectedLanguage, theme);
    const palette = THEMES[theme];
    const preStyle = [
        'display:block',
        'width:100%',
        'max-width:100%',
        'box-sizing:border-box',
        'margin:0',
        'padding:0',
        'border:0',
        `background-color:${palette.background}`,
        `color:${palette.foreground}`,
        'font-family:Consolas,Menlo,monospace',
        `font-size:${Math.round(fontSize)}px`,
        'line-height:1.6',
        'white-space:pre',
        'tab-size:4',
        'overflow-x:auto',
        'overflow-y:hidden',
        'overflow-wrap:normal',
        'word-break:normal',
        'text-align:left',
    ].join(';');
    const numberMode = String(Boolean(numbers));
    let codeHtml = `<pre class="codeblock" data-codeblock-static-numbers="${numberMode}" style="${preStyle}"><code class="language-${detectedLanguage}" style="font:inherit;color:inherit;background-color:transparent">${tokenHtml}</code></pre>`;
    const lineCount = countLines(code);

    if (numbers) {
        const gutter = Array.from({length: lineCount}, (_, index) => index + 1).join('\n');
        const gutterStyle = `${preStyle};display:table;width:auto;max-width:none;min-width:0`;
        codeHtml = `<table role="presentation" style="border-collapse:collapse;border:0;margin:0;width:auto;min-width:100%;background-color:${palette.background}"><tbody><tr><td aria-hidden="true" style="vertical-align:top;padding:0 8px 0 0;border:0;user-select:none"><pre data-codeblock-gutter="true" style="${gutterStyle};color:${palette.muted};text-align:right">${gutter}</pre></td><td style="vertical-align:top;padding:0;border:0">${codeHtml}</td></tr></tbody></table>`;
    }

    const fragment = `<div data-codeblock-html="1" style="box-sizing:border-box;max-width:100%;background-color:${palette.background};color:${palette.foreground};border:1px solid ${palette.border};border-radius:6px;padding:16px;overflow-x:auto;margin:12px 0"><p style="margin:0 0 10px;color:${palette.muted};font-family:Arial,sans-serif;font-size:12px">${escapeHtml(languages[detectedLanguage].label)}</p>${codeHtml}</div>`;
    return {
        fragment,
        code,
        language: detectedLanguage,
        addedLines: lineCount - countLines(source),
        source,
        lineCount,
    };
};

export const createStandaloneDocument = (fragment, readingFragment, title = 'Código para Moodle') => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
html{color-scheme:light}*{box-sizing:border-box}body{margin:0;padding:24px;background:#eef3f9;color:#14233b;font-family:Arial,sans-serif}.page{width:min(1100px,100%);margin:0 auto}.codeblock-controls{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 .7rem}.codeblock-controls button{min-width:3.1rem;padding:.55rem .75rem;border:1px solid #8b99ac;border-radius:7px;color:#24344c;background:#fff;cursor:pointer;font:700 1rem system-ui,sans-serif}.codeblock-controls button:hover,.codeblock-controls button:focus-visible,.codeblock-controls button[aria-pressed="true"]{border-color:#175cd3;outline:2px solid #175cd3;outline-offset:2px;background:#e8f1ff}.hint{margin:16px 2px 0;color:#64748b;font-size:.85rem}@media(max-width:600px){body{padding:10px}}
</style>
</head>
<body>
<main class="page">
<div class="codeblock-controls" aria-label="Controles de lectura">
<button id="smaller" type="button" title="Disminuir tamaño del código" aria-label="Disminuir tamaño del código">A−</button>
<button id="larger" type="button" title="Aumentar tamaño del código" aria-label="Aumentar tamaño del código">A+</button>
<button id="reading" type="button" aria-pressed="false">Ayuda para leer</button>
</div>
${fragment}
<template id="reading-version">${readingFragment}</template>
</main>
<script>
(() => {
    const root = document.querySelector('[data-codeblock-html]');
    const readingRoot = document.querySelector('#reading-version').content.querySelector('[data-codeblock-html]');
    if (!root || !readingRoot) return;
    const codeblock = root.querySelector('pre.codeblock');
    const code = codeblock && codeblock.querySelector('code');
    const gutter = root.querySelector('pre[data-codeblock-gutter]');
    const readingCode = readingRoot.querySelector('pre.codeblock code');
    const readingGutter = readingRoot.querySelector('pre[data-codeblock-gutter]');
    if (!codeblock || !code || !readingCode) return;
    const originalCode = code.innerHTML;
    const originalGutter = gutter && gutter.textContent;
    const changeSize = direction => {
        const current = Number.parseFloat(codeblock.style.fontSize || getComputedStyle(codeblock).fontSize);
        const size = Math.min(28, Math.max(12, current + direction * 2));
        codeblock.style.fontSize = size + 'px';
        if (gutter) gutter.style.fontSize = size + 'px';
    };
    document.querySelector('#smaller').addEventListener('click', () => changeSize(-1));
    document.querySelector('#larger').addEventListener('click', () => changeSize(1));
    const reading = document.querySelector('#reading');
    let active = false;
    reading.addEventListener('click', () => {
        active = !active;
        code.innerHTML = active ? readingCode.innerHTML : originalCode;
        if (gutter && readingGutter) gutter.textContent = active ? readingGutter.textContent : originalGutter;
        const label = active ? 'Ver código original' : 'Ayuda para leer';
        reading.textContent = label;
        reading.title = label;
        reading.setAttribute('aria-label', label);
        reading.setAttribute('aria-pressed', String(active));
    });
})();
</script>
</body>
</html>`;

export {languages, formatForReading};
