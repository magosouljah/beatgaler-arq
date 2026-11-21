#!/usr/bin/env bash
# Ejecuta un comando en el worktree limpio con entorno mínimo, sin credenciales y con guard de red loopback.
# uso: run-isolated.sh <etiqueta> <comando...>
L=/e/777/app/BeatGaler-baseline-logs; WT=${WT_OVERRIDE:-/e/777/app/BeatGaler-baseline-wt}
label="$1"; shift
GUARD='E:\777\app\BeatGaler-baseline-wt\cloud-server\tests\helpers\catalog-net-guard.cjs'
cd "$WT" || exit 99
start=$(date +%s)
env -i PATH="$PATH" SystemRoot="$SYSTEMROOT" SYSTEMROOT="$SYSTEMROOT" windir="$WINDIR" ComSpec="$COMSPEC" PATHEXT="$PATHEXT" \
  TEMP='E:\777\app\BeatGaler-baseline-logs\tmp' TMP='E:\777\app\BeatGaler-baseline-logs\tmp' LOCALAPPDATA="$LOCALAPPDATA" APPDATA="$APPDATA" NUMBER_OF_PROCESSORS="$NUMBER_OF_PROCESSORS" \
  PROCESSOR_ARCHITECTURE="$PROCESSOR_ARCHITECTURE" OS="$OS" \
  HOME='E:\777\app\BeatGaler-baseline-logs\fakehome' USERPROFILE='E:\777\app\BeatGaler-baseline-logs\fakehome' \
  AWS_CONFIG_FILE='E:\777\app\BeatGaler-baseline-logs\fakehome\no-aws-config' AWS_SHARED_CREDENTIALS_FILE='E:\777\app\BeatGaler-baseline-logs\fakehome\no-aws-creds' AWS_EC2_METADATA_DISABLED=true \
  CI=true NODE_ENV=test TZ=UTC \
  DIRECT_DIAGNOSTICS_DIR='E:\777\app\BeatGaler-baseline-logs\diag' \
  NODE_OPTIONS="--require $GUARD --require E:\\777\\app\\BeatGaler-baseline-logs\\deny-dev-pg.cjs" $EXTRA_ENV CATALOG_NET_POLICY=loopback CATALOG_NET_REPORT="E:\777\app\BeatGaler-baseline-logs\net-$label.jsonl" \
  "$@" > "$L/$label.log" 2>&1
rc=$?
echo "$label rc=$rc secs=$(( $(date +%s)-start ))" | tee -a "$L/summary.txt"
