const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {pathToFileURL} = require('node:url');

const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tinycode-web-browser-'));
const browser = process.env.TINYCODE_TEST_BROWSER || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((candidate) => fs.existsSync(candidate));

assert.ok(browser, 'Set TINYCODE_TEST_BROWSER to a Chromium executable.');

const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
};

const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    fs.readFile(target, (error, data) => {
        if (error) {
            response.writeHead(404).end('Not found');
            return;
        }
        response.writeHead(200, {'content-type': types[path.extname(target)] || 'application/octet-stream'}).end(data);
    });
});

server.listen(0, '127.0.0.1', () => {
    const {port} = server.address();
    const visualCheck = Boolean(process.env.TINYCODE_TEST_SCREENSHOT);
    const args = [
        '--headless',
        '--disable-gpu',
        '--disable-background-networking',
        '--no-first-run',
        '--no-default-browser-check',
        '--allow-file-access-from-files',
        `--user-data-dir=${profile}`,
        '--virtual-time-budget=2500',
        '--window-size=1440,1000',
        '--dump-dom',
    ];
    if (process.env.TINYCODE_TEST_SCREENSHOT) {
        args.push(`--screenshot=${path.resolve(process.env.TINYCODE_TEST_SCREENSHOT)}`);
    }
    args.push(`http://127.0.0.1:${port}${visualCheck ? '/' : '/tests/ui-smoke.html'}`);
    const child = spawn(browser, args, {windowsHide: true});
    let output = '';
    let errors = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { errors += chunk; });
    child.on('error', (error) => {
        server.close();
        throw error;
    });
    child.on('close', (code) => {
        try {
            assert.equal(code, 0, errors);
            if (visualCheck) {
                assert.match(output, /data-app-ready="true"/);
                assert.match(output, /TinyCode <span>Web<\/span>/);
                assert.match(output, /<option value="python">Python<\/option>/);
                console.log('PASS: TinyCode Web loaded successfully in Chromium.');
                server.close();
                return;
            }

            assert.match(output, /data-test-status="passed"/);
            assert.match(output, /PASS: conversion, preview, tabs, numbering and reading controls/);
            console.log('PASS: HTTP conversion, language list and Tab key succeeded.');

            const fileArgs = [
                '--headless',
                '--disable-gpu',
                '--disable-background-networking',
                '--no-first-run',
                '--no-default-browser-check',
                '--allow-file-access-from-files',
                `--user-data-dir=${profile}-file`,
                '--virtual-time-budget=3500',
                '--dump-dom',
                pathToFileURL(path.join(root, 'tests', 'ui-smoke.html')).href,
            ];
            const fileChild = spawn(browser, fileArgs, {windowsHide: true});
            let fileOutput = '';
            let fileErrors = '';
            fileChild.stdout.on('data', (chunk) => { fileOutput += chunk; });
            fileChild.stderr.on('data', (chunk) => { fileErrors += chunk; });
            fileChild.on('error', (error) => {
                server.close();
                throw error;
            });
            fileChild.on('close', (fileCode) => {
                server.close();
                try {
                    assert.equal(fileCode, 0, fileErrors);
                    assert.match(fileOutput, /data-test-status="passed"/);
                    assert.match(fileOutput, /PASS: conversion, preview, tabs, numbering and reading controls/);
                    console.log('PASS: Direct-file conversion, language list and Tab key succeeded.');
                } catch (error) {
                    console.error(error.stack || error);
                    process.exitCode = 1;
                }
            });
        } catch (error) {
            server.close();
            console.error(error.stack || error);
            process.exitCode = 1;
        }
    });
});
