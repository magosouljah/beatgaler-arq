'use strict';
// Exporta resultados saneados (sin URLs con credenciales ni rutas locales largas) a datos/resultados.json.
const fs = require('fs');
const L = 'E:/777/app/BeatGaler-baseline-logs/';
const OUT = 'E:/777/app/BeatGaler-arq/linea-base-20261121/datos/resultados.json';
const mask = (s) => String(s).replace(/postgres:\/\/[^@\s]+@/g, 'postgres://***@').split('E:\\777\\app\\').join('').split('E:/777/app/').join('');
const out = { generated: '2026-11-21', sha: 'ad8f8d0436bba5c3f663a301440ebf977200d953' };
for (const p of ['cloud__', 'cloudpg__']) {
  out[p.replace(/_+$/, '')] = JSON.parse(fs.readFileSync(L + p + 'results.json', 'utf8')).map((r) => ({ ...r, tail: mask(r.tail) }));
}
for (const f of ['vitest-component-dom', 'vitest-integration', 'vitest-dom-mtcute', 'vitest-integ-mtcute']) {
  const j = JSON.parse(fs.readFileSync(L + f + '.json', 'utf8'));
  out[f] = {
    tests: j.numTotalTests, pass: j.numPassedTests, fail: j.numFailedTests, skipped: j.numPendingTests,
    files: j.testResults.map((r) => ({
      file: r.name.split('\\').join('/').split('/tests/').pop(),
      status: r.status,
      failed: r.assertionResults.filter((a) => a.status === 'failed').map((a) => a.title),
      failureHead: r.status === 'passed' ? undefined : mask((r.message || '').slice(0, 160)),
    })),
  };
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('ok', Object.keys(out).join(','));
