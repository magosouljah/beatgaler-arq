'use strict';
// ¿Qué tests de cloud-server/tests/catalog corren localmente sin DB y cuáles solo en suites DB (CI)?
const fs = require('fs');
const path = require('path');
const repo = process.argv[2];
const m = JSON.parse(fs.readFileSync(path.join(repo, 'scripts/catalog-suites.json'), 'utf8'));
const inSuite = {};
for (const [k, s] of Object.entries(m.suites)) for (const c of s.cases || []) for (const a of c.cmd.slice(1)) {
  if (a.startsWith('-')) continue;
  const key = a.split(path.sep).join('/');
  (inSuite[key] = inSuite[key] || []).push(k);
}
const local = new Set(['unit', 'faults', 'T08', 'T11', 'T13']);
const files = fs.readdirSync(path.join(repo, 'cloud-server/tests/catalog')).map((f) => 'cloud-server/tests/catalog/' + f);
const onlyCI = files.filter((f) => inSuite[f] && !inSuite[f].some((s) => local.has(s)));
const none = files.filter((f) => !inSuite[f]);
console.log(JSON.stringify({ total: files.length, local: files.length - onlyCI.length - none.length, onlyDbCI: onlyCI.length, inNoSuite: none.map((f) => path.basename(f)) }, null, 1));
