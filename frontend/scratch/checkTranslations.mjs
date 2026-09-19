// scratch/checkTranslations.mjs
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getKeys(filePath) {
  const content = readFileSync(resolve(filePath), 'utf-8');
  const lines = content.split(/\r?\n/);
  const keys = [];
  const keyRegex = /^\s*([a-zA-Z0-9_]+)\s*:/;
  for (const line of lines) {
    const m = line.match(keyRegex);
    if (m) {
      const key = m[1];
      // Exclude import/export statements and other non-dictionary lines
      if (!['export', 'import', 'type', 'from', 'default'].includes(key)) {
        keys.push(key);
      }
    }
  }
  return keys;
}

const basePath = './src/i18n';
const enKeys = getKeys(`${basePath}/en.ts`).sort();
const langs = ['en', 'hi', 'bn', 'te', 'ta', 'mr'];
for (const lang of langs) {
  const keys = getKeys(`${basePath}/${lang}.ts`).sort();
  console.log(`${lang}: ${keys.length}`);
  const missing = enKeys.filter(k => !keys.includes(k));
  if (missing.length) {
    console.log(`${lang} missing ${missing.length}: ${missing.join(', ')}`);
  }
  const extra = keys.filter(k => !enKeys.includes(k));
  if (extra.length) {
    console.log(`${lang} extra ${extra.length}: ${extra.join(', ')}`);
  }
}
