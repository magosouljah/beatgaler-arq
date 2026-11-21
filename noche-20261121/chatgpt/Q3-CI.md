# Q3 — CI y workflows · pasada 2 · 2026-11-21

## Estado comparado
BeatGaler `local/limpieza-preparacion-20261121` y `local/noche-20261121-int` son idénticas al comparar: commit `cfcfb1df1433387d971822dc61bf111fb9e91114`, 0 commits y 0 archivos de diferencia. No hay cambios Q3 nuevos en integración.

## Hallazgo Q3-01 (confirmado; pendiente)
`.github/workflows/catalog-checks.yml:12-35` filtra `cloud-server/tests/catalog/**` y `cloud-server/tests/catalog-harness/**`, pero no `cloud-server/tests/fixtures/catalog/**` ni `cloud-server/tests/postgres-migration-runner.test.cjs`. En `scripts/catalog-suites.json`, la suite `unit` ejecuta `cloud-server/tests/fixtures/catalog/generate-fixtures.cjs --check`, y T03 ejecuta `cloud-server/tests/postgres-migration-runner.test.cjs`. Un push limitado a esos archivos no dispara catalog-checks, aunque ci.yml sí cubre `cloud-server/**` a nivel de trigger; eso no demuestra que ejecute esas suites específicas.

**Codex:** añadir exactamente ambas rutas al filtro de `catalog-checks.yml`, sin cambiar suites, jobs ni producción.

## Hallazgo Q3-02 (confirmado; pendiente de decisión)
`.github/workflows/ci.yml:7-25` y `catalog-checks.yml:8-36` declaran `push` a `main` y `local/**` más `workflow_dispatch`, sin `pull_request`. Los checks de PR se delegan a otros workflows; no inferir que CI V1 o catalog-checks sean checks requeridos para PR sin revisar reglas de protección y sus contextos.

**Codex:** inventariar workflows con `pull_request` y checks requeridos, y elaborar matriz evento × rama × paths × suite antes de proponer un cambio de trigger.

## Evidencia
- [CI V1](https://github.com/magosouljah/BeatGaler/blob/cfcfb1df1433387d971822dc61bf111fb9e91114/.github/workflows/ci.yml#L7-L25)
- [Catalog checks](https://github.com/magosouljah/BeatGaler/blob/cfcfb1df1433387d971822dc61bf111fb9e91114/.github/workflows/catalog-checks.yml#L8-L35)
- [Manifiesto suites](https://github.com/magosouljah/BeatGaler/blob/cfcfb1df1433387d971822dc61bf111fb9e91114/scripts/catalog-suites.json)
- [Comparación de ramas](https://github.com/magosouljah/BeatGaler/compare/local/limpieza-preparacion-20261121...local/noche-20261121-int)

Sin ejecución de tests, sin cambios en BeatGaler, main ni producción. Esta pasada profundiza la relación filtro-manifiesto y constata que integración todavía no presenta diferencias.


## Pasada 3 — 2026-11-21: integración avanzó (cambio real)

Comparación `local/limpieza-preparacion-20261121...local/noche-20261121-int`: **29 commits adelante, 0 detrás**, base `cfcfb1df1433387d971822dc61bf111fb9e91114`; 8 líneas añadidas en `.github/workflows/catalog-checks.yml` y 22 en `scripts/catalog-suites.json`. [Comparación](https://github.com/magosouljah/BeatGaler/compare/local/limpieza-preparacion-20261121...local/noche-20261121-int).

**Q3-01 resuelto en rama de integración, no necesariamente en main.** `.github/workflows/catalog-checks.yml:15-19,29-39` ahora incluye `cloud-server/tests/fixtures/catalog/**` y `cloud-server/tests/postgres-migration-runner.test.cjs` (blob SHA `b1fca51caf7a011215fe340f4f3312127e61f3fe`). Retirar de la cola de Codex la propuesta anterior de añadirlas. También agregó `project-master-message.test.cjs`, `run-browser-harness.mjs` y tres tests de UI específicos. [Archivo](https://github.com/magosouljah/BeatGaler/blob/local/noche-20261121-int/.github/workflows/catalog-checks.yml#L12-L40).

**Q3-03, hueco residual:** el manifiesto `scripts/catalog-suites.json` declara suite `web` activa con caso `tests/catalog-harness/run-browser-harness.mjs`, pero `catalog-checks.yml:42-49` no ofrece `web` en `workflow_dispatch.options` y `:99-101` no la incluye en `SUITES` para push. Así, el cambio del browser harness dispara el workflow por paths pero **no ejecuta esa suite** en el flujo automático especializado. Esto no demuestra que otros workflows no la ejecuten. [Workflow](https://github.com/magosouljah/BeatGaler/blob/local/noche-20261121-int/.github/workflows/catalog-checks.yml#L42-L49) · [Manifiesto](https://github.com/magosouljah/BeatGaler/blob/local/noche-20261121-int/scripts/catalog-suites.json). Codex: verificar si existe ejecución equivalente en otro workflow; si no, proponer job Chrome separado con presupuesto/timeout y gatillo acotado, sin meterlo directamente en el job actual.

**Q3-04, divergencia de disparo vs ejecución:** `ci.yml:10-25` activa Web/Cloud por cualquier cambio en `tests/**` o `cloud-server/**`, mientras `catalog-checks.yml` usa filtros selectivos. No es un defecto automático: evitar ampliar indiscriminadamente filtros hasta comprobar qué pruebas consume cada runner. `ci.yml:30-34` mantiene cancel-in-progress; `catalog-checks.yml:57-59` lo desactiva. Diferencia de política documentada, no corregir sin motivo.

**Q3-02 continúa pendiente:** ninguno de los dos workflows incorpora `pull_request`; revisar checks requeridos y workflows PR antes de cambios. 

No se ejecutaron pruebas ni se modificó BeatGaler. Esta pasada reemplaza expresamente el estado de la pasada 2, ya obsoleto respecto a integración.
