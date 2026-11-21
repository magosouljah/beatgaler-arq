'use strict';
// Clasificación HEURÍSTICA de archivos de test (línea base 2026-11-21):
//   SOLO_FUENTE  lee archivos fuente del producto como texto y no importa/ejecuta módulos del producto
//   MIXTO        lee fuente como texto y además importa/ejecuta módulos del producto
//   COMPORTAMIENTO importa/ejecuta módulos del producto sin leer su texto
//   OTRO         ninguno de los dos patrones (p. ej. solo helpers/fixtures)
// Uso: node classify-tests.cjs <repo> <out.json>
const fs = require('fs');
const path = require('path');
const repo = process.argv[2];
const dirs = ['tests/integration', 'tests/component-dom', 'cloud-server/tests', 'cloud-server/tests/catalog'];
const READ_RE = /\b(readFileSync|readFile)\s*\(/;
// Lecturas cuyo destino parece código fuente del producto.
const SRC_TARGET_RE = /(['"`][^'"`\n]*(src\/|src\\|cloud-server|server-core|server\.js|\.tsx?['"`]|\.c?js['"`]|\.mjs['"`])|\b(serverSource|sourcePath|SRC|srcPath)\b|path\.(join|resolve)\([^)]*(src|cloud-server|['"`]\.\.['"`]))/;
const IMPORT_PRODUCT_RE = /(from\s+['"](\.\.\/)+(src|cloud-server)\/|import\(\s*['"](\.\.\/)+(src|cloud-server)\/|require\(\s*['"]\.\.\/(\.\.\/)*(?!tests\/|helpers\/|fixtures\/)[^'"]+['"]\s*\)|require\(\s*path\.(join|resolve)\([^)]*\.\.[^)]*\)\s*\))/;
const res = [];
for (const d of dirs) {
  const abs = path.join(repo, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!/\.(test|integration|runner)\.(c?js|mjs|tsx?)$|\.test\.tsx?$/.test(f)) continue;
    const t = fs.readFileSync(path.join(abs, f), 'utf8');
    const lines = t.split(/\r?\n/);
    const readLines = lines.filter((l) => READ_RE.test(l) && !/^\s*import\b/.test(l));
    const readsSource = readLines.length > 0 && !readLines.every((l) => /fixtures|\.(json|mp3|wav|png|jpg|zip)['"`]/.test(l));
    const importsProduct = IMPORT_PRODUCT_RE.test(t);
    const kind = readsSource && importsProduct ? 'MIXTO' : readsSource ? 'SOLO_FUENTE' : importsProduct ? 'COMPORTAMIENTO' : 'OTRO';
    res.push({ dir: d, file: f, kind });
  }
}
const summary = {};
for (const r of res) { summary[r.dir] = summary[r.dir] || {}; summary[r.dir][r.kind] = (summary[r.dir][r.kind] || 0) + 1; }
fs.writeFileSync(process.argv[3], JSON.stringify({ summary, files: res }, null, 1));
console.log(JSON.stringify(summary, null, 1));
