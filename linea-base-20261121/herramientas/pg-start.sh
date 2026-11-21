#!/usr/bin/env bash
# Clúster PostgreSQL EFÍMERO para la línea base (no es el clúster de desarrollo 18/main:5432).
set -euo pipefail
BIN=/usr/lib/postgresql/18/bin; D=/tmp/bg-baseline-pg; PORT=54329
PW="$(cat /mnt/e/777/app/BeatGaler-baseline-logs/fakehome/pglab.pw)"
if [ ! -d "$D" ]; then
  echo "$PW" > /tmp/bg-baseline-pw
  $BIN/initdb -D "$D" -U bg_baseline_admin --pwfile=/tmp/bg-baseline-pw --auth=scram-sha-256 --encoding=UTF8 --locale=C.UTF-8 >/tmp/bg-baseline-initdb.log
  rm -f /tmp/bg-baseline-pw
fi
$BIN/pg_ctl -D "$D" -l /tmp/bg-baseline-pg.log -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1 -c fsync=off" -w start
$BIN/psql -h 127.0.0.1 -p $PORT -U bg_baseline_admin -d postgres -Atc "select version(), inet_server_port(), current_setting('data_directory')" <<<"" || true
