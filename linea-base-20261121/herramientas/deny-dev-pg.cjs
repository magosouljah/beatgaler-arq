'use strict';
// Línea base 2026-11-21: precarga adicional que impide cualquier conexión al clúster PostgreSQL de desarrollo
// (puerto 5432) incluso por loopback. Solo se permite el clúster efímero de la línea base (54329).
const net = require('net');
const orig = net.Socket.prototype.connect;
net.Socket.prototype.connect = function denyDevPg(...args) {
  let a = args[0];
  if (Array.isArray(a)) a = a[0];
  const port = a && typeof a === 'object' ? Number(a.port) : Number(a);
  if (port === 5432) {
    const err = Object.assign(new Error('BASELINE_DEV_PG_BLOCKED: port 5432'), { code: 'BASELINE_DEV_PG_BLOCKED' });
    process.nextTick(() => this.destroy(err));
    return this;
  }
  return orig.apply(this, args);
};
