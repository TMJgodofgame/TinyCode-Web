// This file is part of Moodle - http://moodle.org/.

import {languages, normaliseLanguage} from './languages.js';

/**
 * Conservative reading layout for Python and brace-based languages.
 * Only blank lines are added: original text, indentation and line endings survive.
 * Literals, comments, continuations and paired clauses must stay together.
 */

const isImport = (code) => /^(?:import\b|from\s+\S+\s+import\b|package\s|using\s|use\s|#\s*(?:include|import)\b|@import\b|(?:require|include)(?:_once)?\b|library\s*\(|mod\s)/.test(code);
const isAttachment = (line) => line.comment || line.annotation;
const isClause = (code) => /^(?:}\s*)?(?:else\b|elif\b|catch\b|finally\b|except\b|case\b|default\s*:)/.test(code);

/**
 * Mask syntax inside strings/comments, retaining only structural characters.
 * The state continues across lines, including raw strings and heredocs.
 *
 * @param {string[]} lines Original source lines.
 * @returns {object[]} Structural information for each line.
 */
const analyse = (lines, language) => {
    const python = language === 'python' || language === 'auto' && lines.some((line) =>
        /^\s*(?:(?:async\s+)?def\s+\w+|(?:class|if|elif|for|while|with|except|match)\b[^;{]*:\s*(?:#.*)?$|(?:try|else|finally)\s*:|(?:from\s+\S+\s+)?import\s+[\w., ]+$)/.test(line));
    const php = language === 'php' || language === 'auto' && lines.some((line) => /<\?php|\$[a-zA-Z_]\w*/.test(line));
    const profile = languages[language] || languages[python ? 'python' : php ? 'php' : 'javascript'];
    let literal = '';
    let rawLiteral = false;
    let blockComment = 0;
    let doubledQuotes = false;
    let pairedOpen = '';
    let pairedDepth = 0;
    let heredoc = '';
    const parentheses = [];
    const brackets = [];
    let braces = 0;
    let continued = false;
    let importDepth = null;
    let annotationPending = false;

    return lines.map((text) => {
        // A surrounding call such as sort(() => {...}) must not hide the callback body.
        const protectedStart = Boolean(literal || blockComment || heredoc || continued ||
            parentheses.some((depth) => depth >= braces) || brackets.some((depth) => depth >= braces));
        let code = literal || heredoc ? 'S' : '';
        if (heredoc) {
            if (text.trimStart().startsWith(heredoc) &&
                    /^(?:;|,|\)|\]|\s|$)/.test(text.trimStart().slice(heredoc.length))) {
                heredoc = '';
            }
        } else {
            for (let i = 0; i < text.length;) {
                if (blockComment) {
                    if (text.startsWith('/*', i) && profile.nestedComments) {
                        blockComment++;
                        i += 2;
                    } else if (text.startsWith('*/', i)) {
                        blockComment--;
                        i += 2;
                    } else {
                        i++;
                    }
                } else if (literal) {
                    if (pairedOpen && text[i] === pairedOpen) {
                        pairedDepth++;
                        i++;
                    } else if (pairedOpen && text.startsWith(literal, i) && pairedDepth > 1) {
                        pairedDepth--;
                        i++;
                    } else if (doubledQuotes && text.startsWith('""', i)) {
                        i += 2;
                    } else if (text.startsWith(literal, i)) {
                        i += literal.length;
                        literal = '';
                        pairedOpen = '';
                    } else {
                        i += !rawLiteral && text[i] === '\\' ? 2 : 1;
                    }
                } else if ((profile.slashComments !== false && text.startsWith('//', i)) || (profile.hash && text[i] === '#')) {
                    break;
                } else if (profile.blockComments !== false && text.startsWith('/*', i)) {
                    code += ' ';
                    blockComment = 1;
                    i += 2;
                } else {
                    const rest = text.slice(i);
                    const rawString = profile.raw === 'cpp' && /^R"([^\s()\\]{0,16})\(/.exec(rest);
                    const rustString = profile.raw === 'rust' && /^(?:b|c)?r(#{0,32})"/.exec(rest);
                    const swiftString = profile.raw === 'swift' && /^(#+)("""|")/.exec(rest);
                    const verbatim = profile.raw === 'csharp' && /^(?:\$?@|@\$)"/.exec(rest);
                    const perlQuote = language === 'perl' && /^(?:q[qwxr]?|m)\s*([^\w\s])/.exec(rest);
                    const rQuote = language === 'r' && /^[rR]"(-*)([([{])/.exec(rest);
                    const here = (profile.heredoc || language === 'auto') &&
                        /^(?:<<<|<<-?)\s*['"]?([a-zA-Z_]\w*)['"]?\s*;?\s*$/.exec(rest);
                    doubledQuotes = false;
                    if (perlQuote || rQuote) {
                        const opening = perlQuote ? perlQuote[1] : rQuote[2];
                        const closing = {'{': '}', '[': ']', '(': ')', '<': '>'}[opening] || opening;
                        literal = rQuote ? closing + rQuote[1] + '"' : closing;
                        pairedOpen = !rQuote && closing !== opening ? opening : '';
                        pairedDepth = 1;
                        rawLiteral = Boolean(rQuote);
                        code += 'S';
                        i += (perlQuote || rQuote)[0].length;
                    } else if (rawString) {
                        literal = `)${rawString[1]}"`;
                        rawLiteral = true;
                        code += 'S';
                        i += rawString[0].length;
                    } else if (rustString || swiftString || verbatim) {
                        literal = rustString ? '"' + rustString[1] : swiftString ? swiftString[2] + swiftString[1] : '"';
                        doubledQuotes = Boolean(verbatim);
                        rawLiteral = true;
                        code += 'S';
                        i += (rustString || swiftString || verbatim)[0].length;
                    } else if (here) {
                        heredoc = here[1];
                        code += 'S';
                        break;
                    } else if (text[i] === '"' || text[i] === "'" &&
                            (profile.sq || /^'(?:\\.|[^'\\]){1,8}'/.test(rest)) || text[i] === '`' && profile.backtick) {
                        literal = profile.triple && (rest.startsWith('"""') || rest.startsWith("'''")) ?
                            rest.slice(0, 3) : text[i];
                        if (profile.raw === 'csharp' && /^"{3,}/.test(rest)) {
                            literal = /^"{3,}/.exec(rest)[0];
                        }
                        rawLiteral = text[i] === '`' && language === 'go';
                        code += 'S';
                        i += literal.length;
                    } else if (profile.regex && text[i] === '/' &&
                            /(?:^|[=(:,!\[?;{|&]|\breturn|\bthrow|\bcase)\s*$/.test(code)) {
                        // JavaScript regular expressions can contain braces and comment markers.
                        let end = i + 1;
                        let characterClass = false;
                        for (; end < text.length; end++) {
                            if (text[end] === '\\') {
                                end++;
                            } else if (text[end] === '[') {
                                characterClass = true;
                            } else if (text[end] === ']') {
                                characterClass = false;
                            } else if (text[end] === '/' && !characterClass) {
                                break;
                            }
                        }
                        if (end < text.length) {
                            code += 'S';
                            i = end + 1;
                        } else {
                            code += text[i++];
                        }
                    } else {
                        code += text[i++];
                    }
                }
            }
        }

        code = code.trim();
        const startBraces = braces;
        for (const character of code) {
            if (character === '(') {
                parentheses.push(braces);
            } else if (character === ')') {
                parentheses.pop();
            } else if (character === '[') {
                brackets.push(braces);
            } else if (character === ']') {
                brackets.pop();
            }
            braces = Math.max(0, braces + (character === '{' ? 1 : character === '}' ? -1 : 0));
        }
        const importing = importDepth !== null || isImport(code);
        const annotation = annotationPending || !profile.style && /^@\w/.test(code) &&
            !/^@(?:import|interface|implementation|protocol|end)\b/.test(code);
        annotationPending = annotation && parentheses.length > 0;
        if (importing && importDepth === null) {
            importDepth = startBraces;
        }
        continued = /\\\s*$/.test(text);
        if (importDepth !== null && !parentheses.length && !brackets.length && !continued && braces <= importDepth) {
            importDepth = null;
        }

        const directive = profile.preprocessor && /^#\s*(?:define|if|ifdef|ifndef|endif|else|elif|pragma|undef|error|line|warning)\b/.test(code);
        return {
            code,
            blank: !text.trim(),
            comment: !code && !literal && !heredoc,
            protected: protectedStart || directive,
            indent: text.match(/^[\t ]*/)[0].replace(/\t/g, '    ').length,
            importing,
            annotation,
            directive,
        };
    });
};

/**
 * Return the source-line indexes which should have a blank line before them.
 * Unknown syntax is left alone unless a structural boundary is recognisable.
 *
 * @param {string[]} lines Original source lines, without newline characters.
 * @returns {Set<number>} Insertion positions; no existing line is removed.
 */
export const getReadingBreaks = (lines, language = 'auto') => {
    language = normaliseLanguage(language);
    if (language === 'plaintext') {
        return new Set();
    }
    const info = analyse(lines, language);
    const breaks = new Set();
    info.forEach((current, index) => {
        if (!index || current.blank || current.protected || !current.code || isAttachment(current) ||
                isClause(current.code) || /^[}\])]/.test(current.code) || current.code === '{') {
            return;
        }

        // Keep a function's comments, annotations and Python decorators attached to it.
        let start = index;
        while (start > 0 && !info[start - 1].blank && isAttachment(info[start - 1])) {
            start--;
        }
        const previous = info[start - 1];
        if (info[start].protected || !previous || previous.blank || !previous.code || /[{:,]$/.test(previous.code) ||
                /\\$/.test(previous.code) || previous.directive) {
            return;
        }
        if (current.importing && previous.importing) {
            return;
        }
        if (current.indent > previous.indent &&
                /^(?:if|for|foreach|while|switch)\b.*\)$/.test(previous.code)) {
            return;
        }

        const structure = /^(?:(?:async\s+)?(?:def|function|func|fun|fn|sub)\b|(?:class|interface|enum|struct|namespace|trait|impl|extension|protocol|object|record)\b|(?:if|for|foreach|while|switch|try|do|with|match|when|unless|until|repeat|guard|loop|async\s+(?:for|with))\b)/.test(current.code) ||
            /\{\s*$/.test(current.code) || info[index + 1]?.code === '{';
        const exit = /^(?:return|throw|yield)\b/.test(current.code);
        const closed = /^}(?:\s*[);])*\s*;?$/.test(previous.code);
        const dedented = current.indent < info[index - 1].indent;
        // A do/while tail belongs to the preceding block.
        if (closed && /^while\b.*;\s*$/.test(current.code)) {
            return;
        }
        if ((previous.importing && !current.importing) || structure || exit || closed || dedented) {
            breaks.add(start);
        }
    });
    return breaks;
};

/**
 * Add reading gaps while preserving every original character and line ending.
 *
 * @param {string} source Original source code.
 * @returns {string} Source with extra blank lines at safe boundaries.
 */
export const formatForReading = (source, language = 'auto') => {
    const parts = source.split(/(\r\n|\r|\n)/);
    const lines = parts.filter((part, index) => index % 2 === 0);
    const breaks = getReadingBreaks(lines, language);
    return parts.map((part, index) => index % 2 === 0 && breaks.has(index / 2) ?
        parts[index - 1] + part : part).join('');
};
