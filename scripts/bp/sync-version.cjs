#!/usr/bin/env node

// One number per release: package.json decides it, src/bpInfo.ts is what the
// running code reports — `/v3/status.built` for the API, `sdk.version` for the
// SDK. `bp:bump` writes both; a hand-edited version writes only the first, and
// the gap stayed invisible until a status answer named a version nobody shipped.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const {version} = require(path.join(root, 'package.json'));
const file = path.join(root, 'src/bpInfo.ts');
const line = `export const bpInfo = {version: 'v${version}'};\n`;

if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === line) {
    console.log(`bpInfo already reports v${version}`);
} else {
    fs.writeFileSync(file, line);
    console.log(`bpInfo now reports v${version}`);
}
