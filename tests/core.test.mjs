import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const vendorContext = {};
vm.createContext(vendorContext);
vm.runInContext(fs.readFileSync(new URL('../vendor/highlight.min.js', import.meta.url), 'utf8'), vendorContext);
const hljs = vendorContext.hljs;
globalThis.hljs = hljs;

const {
    convert,
    createStandaloneDocument,
    detectLanguage,
    formatForReading,
    languages,
} = await import('../js/core.js');

const decodeEntities = (value) => value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&');

const codeText = (fragment) => {
    const markup = /<code\b[^>]*>([\s\S]*?)<\/code>/.exec(fragment)?.[1];
    assert.notEqual(markup, undefined, 'The fragment must contain a code element.');
    return decodeEntities(markup.replace(/<[^>]+>/g, ''));
};

test('all declared languages have a bundled highlighter', () => {
    for (const [name, profile] of Object.entries(languages)) {
        const highlighterName = name === 'objectivec' ? 'objectivec' : name === 'plaintext' ? 'plaintext' : profile.lexer;
        assert.ok(hljs.getLanguage(highlighterName), `Missing highlighter for ${name}`);
    }
});

test('conversion preserves source and emits Moodle-safe static HTML', () => {
    const source = 'const text = "</code><script>alert(1)</script> & España 😀";\n\treturn text;\n';
    const result = convert(source, {language: 'javascript', numbers: true, theme: 'Oscuro'});

    assert.equal(codeText(result.fragment), source);
    assert.match(result.fragment, /class="codeblock"/);
    assert.match(result.fragment, /class="language-javascript"/);
    assert.match(result.fragment, /data-codeblock-gutter="true"/);
    assert.match(result.fragment, /data-codeblock-gutter="true" style="[^"]*display:table;width:auto/);
    assert.match(result.fragment, /style="[^"]*color:/);
    assert.doesNotMatch(result.fragment, /<script\b/i);
    assert.doesNotMatch(result.fragment, /<link\b|<style\b/i);
});

test('options change theme, size and line-number output', () => {
    const result = convert('def hello():\n    return "hola"', {
        language: 'python',
        numbers: false,
        theme: 'Claro',
        fontSize: 18,
    });
    assert.doesNotMatch(result.fragment, /<table\b/);
    assert.match(result.fragment, /font-size:18px/);
    assert.match(result.fragment, /background-color:#f6f8fa/);
});

test('automatic detection uses filenames and source heuristics', () => {
    assert.equal(detectLanguage('', 'example.rs'), 'rust');
    assert.equal(detectLanguage('async def main():\n    return 1'), 'python');
    assert.equal(detectLanguage('const value = () => 1;'), 'javascript');
    assert.equal(detectLanguage('{"ready": true}'), 'json');
});

test('reading help is conservative and idempotent', () => {
    const source = 'import os\nfrom pathlib import Path\ndef first(items):\n    for item in items:\n        if item:\n            return item\n    return None';
    const expected = 'import os\nfrom pathlib import Path\n\ndef first(items):\n    for item in items:\n        if item:\n            return item\n\n    return None';
    const formatted = formatForReading(source, 'python');
    assert.equal(formatted, expected);
    assert.equal(formatForReading(formatted, 'python'), formatted);
});

test('standalone document includes local reading and font controls', () => {
    const source = 'import os\ndef example():\n    return os';
    const original = convert(source, {language: 'python'});
    const reading = convert(source, {language: 'python', reading: true});
    const document = createStandaloneDocument(original.fragment, reading.fragment);
    assert.match(document, /Ayuda para leer/);
    assert.match(document, /id="reading-version"/);
    assert.match(document, /A−/);
    assert.match(document, /A\+/);
    assert.doesNotMatch(document, /Página generada con TinyCode Web/);
});

test('validation rejects empty, oversized and unknown input', () => {
    assert.throws(() => convert(''), /Escribe código/);
    assert.throws(() => convert('x'.repeat(2_000_001)), /supera los 2 MB/);
    assert.throws(() => convert('code', {language: 'brainfudge'}), /Lenguaje no admitido/);
    assert.throws(() => convert('code', {fontSize: 99}), /entre 10 y 28/);
});
