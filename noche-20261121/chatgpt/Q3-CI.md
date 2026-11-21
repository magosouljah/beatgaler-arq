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
