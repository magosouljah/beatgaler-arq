#!/usr/bin/env bash
# Pasada Cloud por archivo (línea base 2026-11-21). Cada archivo en su proceso, con timeout y entorno aislado.
# uso: cloud-runner.sh pass1|pass2
L=/e/777/app/BeatGaler-baseline-logs; WT=/e/777/app/BeatGaler-baseline-wt; R=$L/run-isolated.sh
mode="$1"
cd "$WT/cloud-server/tests" || exit 99
if [ "$mode" = pass1 ]; then
  files=$(ls *.cjs *.mjs | grep -vE '\.integration\.cjs$|\.worker\.cjs$|\.verify\.cjs$')
  for f in $files; do
    EXTRA_ENV="" timeout 300 "$R" "cloud__$f" node "cloud-server/tests/$f"
  done
else
  PW=$(cat $L/fakehome/pglab.pw); U="postgres://bg_baseline_admin:$PW@127.0.0.1:54329"
  ADMIN_VARS="BEATGALER_STEP1_TEST_ADMIN_URL=$U/postgres BEATGALER_STEP2_TEST_ADMIN_URL=$U/postgres BILLING_CHECKOUT_TEST_ADMIN_URL=$U/postgres BILLING_LIFECYCLE_TEST_ADMIN_URL=$U/postgres BILLING_E2E_TEST_ADMIN_URL=$U/postgres BILLING_RECONCILIATION_TEST_ADMIN_URL=$U/postgres BILLING_MIGRATION_TEST_ADMIN_URL=$U/postgres BILLING_WEBHOOK_TEST_ADMIN_URL=$U/postgres"
  i=0
  for f in $(ls *.integration.cjs | grep -v '^postgres-live\.integration\.cjs$'); do
    i=$((i+1)); db="bgbl_$i"
    # Base vacía propia para los tests que usan DATABASE_URL directamente (clúster efímero, nunca 5432).
    node -e "const {Client}=require('$WT/cloud-server/node_modules/pg');const c=new Client({connectionString:process.argv[1]});c.connect().then(()=>c.query('DROP DATABASE IF EXISTS $db')).then(()=>c.query('CREATE DATABASE $db')).then(()=>c.end())" "$U/postgres"
    EXTRA_ENV="$ADMIN_VARS DATABASE_URL=$U/$db BEATGALER_ALLOW_DESTRUCTIVE_PG_TEST=true" timeout 600 "$R" "cloudpg__$f" node "cloud-server/tests/$f"
  done
fi
