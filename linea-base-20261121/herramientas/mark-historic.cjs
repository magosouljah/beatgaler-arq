'use strict';
// Antepone un aviso HISTÓRICO de una línea a documentos antiguos de BeatGaler-arq sin alterar el resto.
// Verifica que el contenido posterior al aviso sea byte a byte el original. Idempotente.
const fs = require('fs');
const path = require('path');
const ROOT = 'E:/777/app/BeatGaler-arq';
const MD = (why) => `> **HISTÓRICO — congelado el 2026-11-21. No es estado vigente.** ${why} Entrada vigente: [README](${'%REL%'}README.md).\n\n`;
const items = [
  ['ESTADO-DIAGNOSTICO.md', 'Pasada 1 sobre `5cb6ccc` (11-nov, antes de LIVE y T25); varias conclusiones ya no son ciertas.'],
  ['PROMPT-DIAGNOSTICO-ARQUITECTURA.md', 'Encargo de la pasada 1 (11-nov).'],
  ['auditoria-v1/PROTOCOLO.md', 'Auditoría autónoma 20-nov; protocolo escrito para la rama LOCAL ya archivada. No crear más ejecuciones.'],
  ['auditoria-v1/PLAN.md', 'Auditoría autónoma 20-nov (Director).'],
  ['auditoria-v1/COBERTURA.md', 'Auditoría autónoma 20-nov; cobertura nunca certificada.'],
  ['auditoria-v1/HALLAZGOS.md', 'Auditoría autónoma 20-nov; revalidar cada hallazgo en el SHA actual.'],
  ['auditoria-v1/INVENTARIO.md', 'Auditoría autónoma 20-nov.'],
  ['auditoria-v1/FLUJOS.md', 'Auditoría autónoma 20-nov.'],
  ['auditoria-v1/MAPA-CODIGO.md', 'Auditoría autónoma 20-nov.'],
  ['pasada-1/zonas/01-frontend-shell-gallery.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`.'],
  ['pasada-1/zonas/02-cuentas-y-pagos.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`.'],
  ['pasada-1/zonas/03-navegador-transporte-reproduccion.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`.'],
  ['pasada-1/zonas/04-servidor-esqueleto-persistencia.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`.'],
  ['pasada-1/zonas/05-servidor-telegram-index.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`; el INDEX fue retirado del runtime en T25.'],
  ['pasada-1/zonas/06-catalogo-postgresql.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`.'],
  ['pasada-1/zonas/07-pruebas-ci-infra-scripts.md', 'Evidencia de la pasada 1 sobre `5cb6ccc`.'],
  ['borradores/GLOSARIO-borrador.md', 'Borrador sin acordar (11-nov).'],
  ['panorama-main-20261120/PROMPTS.md', 'Prompts que produjeron P01–P07; los informes son la fuente, no estos prompts.'],
];
const out = [];
for (const [rel, why] of items) {
  const file = path.join(ROOT, rel);
  const orig = fs.readFileSync(file);
  const text = orig.toString('utf8');
  if (text.startsWith('> **HISTÓRICO')) { out.push(`ya marcado ${rel}`); continue; }
  const up = '../'.repeat(rel.split('/').length - 1);
  const banner = Buffer.from(MD(why).replace('%REL%', up), 'utf8');
  const next = Buffer.concat([banner, orig]);
  fs.writeFileSync(file, next);
  const check = fs.readFileSync(file);
  if (!check.subarray(banner.length).equals(orig)) throw new Error(`verificación fallida ${rel}`);
  out.push(`marcado ${rel}`);
}
// HTML: aviso inmediatamente después de <body ...>
const html = path.join(ROOT, 'pasada-1/informe-pasada-1.html');
const h = fs.readFileSync(html, 'utf8');
if (!h.includes('data-historico="20261121"')) {
  const i = h.indexOf('>', h.indexOf('<body')) + 1;
  const div = '\n<div data-historico="20261121" style="background:#fde68a;color:#111;padding:8px 16px;font-weight:600">HISTÓRICO — congelado el 2026-11-21. Pasada 1 sobre 5cb6ccc; no es estado vigente. Entrada vigente: ../README.md</div>';
  const next = h.slice(0, i) + div + h.slice(i);
  fs.writeFileSync(html, next, 'utf8');
  if (next.slice(0, i) + next.slice(i + div.length) !== h) throw new Error('verificación HTML fallida');
  out.push('marcado pasada-1/informe-pasada-1.html');
}
console.log(out.join('\n'));
