'use strict';
// Agrega resultados por archivo de los logs cloud__* / cloudpg__* (línea base 2026-11-21).
const fs = require('fs');
const L = 'E:/777/app/BeatGaler-baseline-logs/';
const prefix = process.argv[2] || 'cloud__';
const summary = fs.readFileSync(L + 'summary.txt', 'utf8').split(/\r?\n/);
const rcOf = (label) => { const l = summary.filter((s) => s.startsWith(label + ' ')).pop(); const m = l && /rc=(\d+) secs=(\d+)/.exec(l); return m ? { rc: +m[1], secs: +m[2] } : { rc: null, secs: null }; };
const rows = [];
for (const f of fs.readdirSync(L).filter((f) => f.startsWith(prefix) && f.endsWith('.log'))) {
  const label = f.slice(0, -4);
  const t = fs.readFileSync(L + f, 'utf8');
  const num = (k) => { const m = new RegExp('^(?:#|\u2139) ' + k + ' (\\d+)', 'm').exec(t); return m ? +m[1] : null; };
  const nodeTest = num('tests') !== null;
  const net = fs.existsSync(L + 'net-' + label + '.jsonl') ? fs.readFileSync(L + 'net-' + label + '.jsonl', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : [];
  const blocked = net.reduce((a, r) => a + (r.blocked || 0), 0);
  const blockedHosts = [...new Set(net.flatMap((r) => (r.detail || []).filter((d) => !d.allowed).map((d) => `${d.host}:${d.port}`)))];
  const { rc, secs } = rcOf(label);
  rows.push({ file: label.slice(prefix.length), rc, secs, nodeTest, tests: num('tests'), pass: num('pass'), fail: num('fail'), skipped: num('skipped'), todo: num('todo'), blocked, blockedHosts, bytes: t.length, tail: t.trim().split(/\r?\n/).slice(-2).join(' | ').slice(0, 220) });
}
fs.writeFileSync(L + prefix + 'results.json', JSON.stringify(rows, null, 1));
const agg = rows.reduce((a, r) => { a.files++; if (r.rc === 0) a.rc0++; else a.rcFail.push(r.file); if (r.nodeTest) { a.nt++; a.tests += r.tests; a.pass += r.pass; a.fail += r.fail; a.skipped += r.skipped; a.todo += r.todo || 0; if (r.skipped) a.skipFiles.push(`${r.file}:${r.skipped}`); } if (r.blocked) a.netBlocked.push(`${r.file}:${r.blockedHosts.join(',')}`); return a; }, { files: 0, rc0: 0, rcFail: [], nt: 0, tests: 0, pass: 0, fail: 0, skipped: 0, todo: 0, skipFiles: [], netBlocked: [] });
console.log(JSON.stringify(agg, null, 1));
