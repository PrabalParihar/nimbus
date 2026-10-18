import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout, clearTimeout } from 'node:timers';

// Runs the compiled CLI with only public, fictional-demo configuration.
// No inherited credentials, external API, fixed port or pre-existing service.
const child = spawn(process.execPath, ['dist/server.js'], {
  env: { HOST: '127.0.0.1', PORT: '0', REWARD_EVERY: '2', DISCOUNT_PERCENT: '10' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const exited = once(child, 'exit');
let diagnostics = '';
child.stderr.on('data', chunk => { diagnostics += chunk.toString(); });
try {
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${diagnostics}`)), 10_000);
    let stdout = '';
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const match = stdout.match(/listening at (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', () => { clearTimeout(timeout); reject(new Error(`Server exited before readiness: ${diagnostics}`)); });
  });
  async function request(method, path, { body, key, status = 200 } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(key ? { 'idempotency-key': key } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    assert.ok([status].flat().includes(response.status), `${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
    return { status: response.status, body: data, headers: response.headers };
  }
  async function cartWith(productId, quantity = 1) {
    const { body: cart } = await request('POST', '/carts', { body: {}, status: 201 });
    await request('POST', `/carts/${cart.id}/items`, { body: { productId, quantity } });
    return cart.id;
  }
  const health = await request('GET', '/health');
  assert.equal(health.body.status, 'ok');
  assert.equal((await request('GET', '/products')).body.length, 5);
  const id = await cartWith('pen', 2);
  const retries = await Promise.all(Array.from({ length: 10 }, () => request('POST', `/carts/${id}/checkout`, { body: {}, key: 'smoke-retry', status: [200, 201] })));
  assert.equal(retries.filter(r => r.status === 201).length, 1);
  retries.forEach(r => assert.deepEqual(r.body, retries[0].body));
  assert.equal(retries[0].body.totalCents, 210);
  await request('POST', `/carts/${await cartWith('mug')}/checkout`, { body: {}, key: 'smoke-second', status: 201 });
  const { body: coupon } = await request('POST', '/admin/coupons', { body: {}, status: 201 });
  assert.equal(coupon.milestone, 2);
  const recovery = await cartWith('limited-print', 2);
  const before = (await request('GET', '/admin/report')).body;
  const failure = await request('POST', `/carts/${recovery}/checkout`, { body: { couponCode: coupon.code }, key: 'smoke-recover', status: 409 });
  assert.equal(failure.body.error.code, 'INSUFFICIENT_STOCK');
  assert.deepEqual((await request('GET', '/admin/report')).body, before);
  await request('PUT', `/carts/${recovery}/items/limited-print`, { body: { quantity: 1 } });
  const recovered = await request('POST', `/carts/${recovery}/checkout`, { body: { couponCode: coupon.code }, key: 'smoke-recover', status: 201 });
  assert.equal(recovered.body.discountCents, 500);
  assert.equal(recovered.body.totalCents, 4499);
  await request('PATCH', '/admin/products/limited-print', { body: { available: 1 } });
  const competing = await Promise.all(Array.from({ length: 20 }, () => cartWith('limited-print')));
  const results = await Promise.all(competing.map((cartId, i) => request('POST', `/carts/${cartId}/checkout`, { body: {}, key: `smoke-stock-${i}`, status: [201, 409] })));
  assert.equal(results.filter(r => r.status === 201).length, 1);
  results.filter(r => r.status === 409).forEach(r => assert.equal(r.body.error.code, 'INSUFFICIENT_STOCK'));
  const { body: orders } = await request('GET', '/orders');
  const { body: report } = await request('GET', '/admin/report');
  assert.equal(orders.length, 4);
  assert.equal(report.totalOrders, orders.length);
  assert.equal(report.grossRevenueCents, orders.reduce((sum, order) => sum + order.subtotalCents, 0));
  assert.equal(report.totalDiscountsCents, orders.reduce((sum, order) => sum + order.discountCents, 0));
  assert.equal(report.netRevenueCents, report.grossRevenueCents - report.totalDiscountsCents);
  assert.deepEqual(report.purchasedQuantityByProduct, { 'limited-print': 2, mug: 1, pen: 2 });
  assert.deepEqual(report.coupons, { generated: 1, available: 0, redeemed: 1 });
  assert.deepEqual((await request('GET', '/admin/report')).body, report);
  console.log('PASS: compiled CLI, fictional seed, HTTP retries, coupon rollback/recovery, 20 competing checkouts, reconciled read-only report');
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
  const [code, signal] = await exited;
  clearTimeout(timeout);
  assert.equal(signal, null, 'Server should close gracefully without forced termination');
  assert.equal(code, 0, `Server exited with ${code}: ${diagnostics}`);
}
