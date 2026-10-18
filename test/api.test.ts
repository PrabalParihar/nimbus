import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { Store, type CartView, type Coupon, type Order } from '../src/store.js';

type ErrorBody = { error: { code: string; message: string } };
function appFor(t: TestContext, store = new Store()) {
  const app = buildApp(store);
  t.after(() => app.close());
  return app;
}
async function cartWith(app: FastifyInstance, productId = 'pen', quantity = 1) {
  const created = await app.inject({ method: 'POST', url: '/carts', payload: {} });
  assert.equal(created.statusCode, 201);
  const id = created.json<CartView>().id;
  const added = await app.inject({ method: 'POST', url: `/carts/${id}/items`, payload: { productId, quantity } });
  assert.equal(added.statusCode, 200);
  return id;
}
function checkout(app: FastifyInstance, cartId: string, key: string, couponCode?: string) {
  return app.inject({ method: 'POST', url: `/carts/${cartId}/checkout`, headers: { 'idempotency-key': key }, payload: couponCode ? { couponCode } : {} });
}

test('HTTP cart lifecycle, admin price changes, snapshots, and retrieval', async t => {
  const app = appFor(t);
  const products = await app.inject('/products');
  assert.equal(products.json<unknown[]>().length, 5);
  const id = await cartWith(app, 'pen', 2);
  assert.equal((await app.inject({ method: 'PUT', url: `/carts/${id}/items/pen`, payload: { quantity: 3 } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'DELETE', url: `/carts/${id}/items/pen` })).json<CartView>().subtotalCents, 0);
  await app.inject({ method: 'POST', url: `/carts/${id}/items`, payload: { productId: 'pen', quantity: 2 } });
  assert.equal((await app.inject({ method: 'PATCH', url: '/admin/products/pen', payload: { unitPriceCents: 200, available: 2 } })).statusCode, 200);
  assert.equal((await app.inject(`/carts/${id}`)).json<CartView>().subtotalCents, 400);
  const result = await checkout(app, id, 'lifecycle');
  assert.equal(result.statusCode, 201);
  const order = result.json<Order>();
  assert.equal(order.totalCents, 400);
  assert.equal(result.headers.location, `/orders/${order.id}`);
  assert.deepEqual((await app.inject(`/orders/${order.id}`)).json(), order);
  assert.deepEqual((await app.inject('/orders')).json(), [order]);
  assert.equal((await app.inject(`/carts/${id}`)).json<CartView>().status, 'checked_out');
  assert.equal((await app.inject('/health')).statusCode, 200);
  assert.deepEqual((await app.inject('/config')).json(), { rewardEvery: 5, discountPercent: 10, currency: 'USD' });
});

test('20 overlapping scarce-stock checkouts commit exactly one sale', async t => {
  const app = appFor(t);
  const ids = await Promise.all(Array.from({ length: 20 }, () => cartWith(app, 'limited-print')));
  const results = await Promise.all(ids.map((id, i) => checkout(app, id, `scarce-${i}`)));
  assert.equal(results.filter(r => r.statusCode === 201).length, 1);
  const failures = results.filter(r => r.statusCode !== 201);
  assert.equal(failures.length, 19);
  failures.forEach(r => { assert.equal(r.statusCode, 409); assert.equal(r.json<ErrorBody>().error.code, 'INSUFFICIENT_STOCK'); });
  const products = (await app.inject('/products')).json<{ id: string; available: number }[]>();
  assert.equal(products.find(p => p.id === 'limited-print')?.available, 0);
  const report = (await app.inject('/admin/report')).json();
  assert.equal(report.totalOrders, 1);
  assert.equal(report.purchasedQuantityByProduct['limited-print'], 1);
});

test('20 concurrent retries share the same order and only one stock deduction', async t => {
  const app = appFor(t);
  const id = await cartWith(app, 'pen', 3);
  const results = await Promise.all(Array.from({ length: 20 }, () => checkout(app, id, 'same-request')));
  assert.equal(results.filter(r => r.statusCode === 201).length, 1);
  assert.equal(results.filter(r => r.statusCode === 200).length, 19);
  results.forEach(r => assert.deepEqual(r.json(), results[0]!.json()));
  assert.equal(results.filter(r => r.headers['idempotency-replayed'] === 'true').length, 19);
  const products = (await app.inject('/products')).json<{ id: string; available: number }[]>();
  assert.equal(products.find(p => p.id === 'pen')?.available, 97);
});

test('different keys competing for one cart cannot create multiple orders', async t => {
  const app = appFor(t);
  const id = await cartWith(app);
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => checkout(app, id, `key-${i}`)));
  assert.equal(results.filter(r => r.statusCode === 201).length, 1);
  results.filter(r => r.statusCode !== 201).forEach(r => {
    assert.equal(r.statusCode, 409);
    assert.equal(r.json<ErrorBody>().error.code, 'CART_CLOSED');
  });
});

test('one globally scoped idempotency key cannot check out two carts', async t => {
  const app = appFor(t);
  const ids = await Promise.all([cartWith(app), cartWith(app)]);
  const results = await Promise.all(ids.map(id => checkout(app, id, 'global-key')));
  assert.deepEqual(results.map(r => r.statusCode).sort(), [201, 409]);
  assert.equal(results.find(r => r.statusCode === 409)?.json<ErrorBody>().error.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal((await app.inject('/orders')).json<unknown[]>().length, 1);
});

test('competing coupon checkouts redeem once and leave the losing cart/stock intact', async t => {
  const app = appFor(t, new Store({ rewardEvery: 1 }));
  await checkout(app, await cartWith(app), 'unlock');
  const coupon = (await app.inject({ method: 'POST', url: '/admin/coupons', payload: {} })).json<Coupon>();
  const ids = await Promise.all([cartWith(app, 'mug'), cartWith(app, 'tote')]);
  const results = await Promise.all(ids.map((id, i) => checkout(app, id, `use-${i}`, coupon.code)));
  assert.deepEqual(results.map(r => r.statusCode).sort(), [201, 409]);
  const loser = results.findIndex(r => r.statusCode === 409);
  assert.equal(results[loser]!.json<ErrorBody>().error.code, 'COUPON_REDEEMED');
  assert.equal((await app.inject(`/carts/${ids[loser]}`)).json<CartView>().status, 'open');
  const products = (await app.inject('/products')).json<{ id: string; available: number }[]>();
  assert.equal(products.find(p => p.id === (loser === 0 ? 'mug' : 'tote'))?.available, loser === 0 ? 20 : 15);
  const coupons = (await app.inject('/admin/coupons')).json<Coupon[]>();
  assert.equal(coupons[0]?.redeemedByOrderId, results.find(r => r.statusCode === 201)?.json<Order>().id);
});

test('overlapping admin requests generate each eligible milestone once; report reads do not generate', async t => {
  const app = appFor(t, new Store({ rewardEvery: 2 }));
  for (let i = 0; i < 6; i++) await checkout(app, await cartWith(app), `qualify-${i}`);
  const initial = (await app.inject('/admin/report')).json();
  assert.equal(initial.coupons.generated, 0);
  const results = await Promise.all(Array.from({ length: 10 }, () => app.inject({ method: 'POST', url: '/admin/coupons', payload: {} })));
  assert.deepEqual(results.filter(r => r.statusCode === 201).map(r => r.json<Coupon>().milestone).sort((a, b) => a - b), [2, 4, 6]);
  assert.equal(results.filter(r => r.statusCode === 409 && r.json<ErrorBody>().error.code === 'NO_ELIGIBLE_MILESTONE').length, 7);
  const reports = await Promise.all(Array.from({ length: 10 }, () => app.inject('/admin/report')));
  reports.forEach(r => assert.deepEqual(r.json(), reports[0]!.json()));
  assert.deepEqual(reports[0]!.json().coupons, { generated: 3, available: 3, redeemed: 0 });
});

test('overlapping adds accumulate; cart edits cannot race past checkout', async t => {
  const app = appFor(t);
  const id = await cartWith(app);
  const adds = await Promise.all(Array.from({ length: 10 }, () => app.inject({ method: 'POST', url: `/carts/${id}/items`, payload: { productId: 'pen', quantity: 1 } })));
  adds.forEach(r => assert.equal(r.statusCode, 200));
  assert.equal((await app.inject(`/carts/${id}`)).json<CartView>().items[0]?.quantity, 11);
  const results = await Promise.all([
    checkout(app, id, 'race-edit'),
    app.inject({ method: 'PUT', url: `/carts/${id}/items/pen`, payload: { quantity: 2 } }),
  ]);
  assert.equal(results[0]!.statusCode, 201);
  const order = results[0]!.json<Order>();
  assert.ok(order.items[0]?.quantity === 11 || order.items[0]?.quantity === 2);
  const edit = results[1]!;
  if (edit.statusCode === 200) assert.equal(order.items[0]?.quantity, 2);
  else { assert.equal(edit.statusCode, 409); assert.equal(edit.json<ErrorBody>().error.code, 'CART_CLOSED'); }
  assert.deepEqual((await app.inject(`/orders/${order.id}`)).json(), order);
});

test('500 during staged checkout is sanitized, rolls back, and permits same-key recovery', async t => {
  let fail = false;
  const store = new Store({ rewardEvery: 1, now: () => { if (fail) throw new Error('fictional internal diagnostic'); return new Date(); } });
  const app = appFor(t, store);
  await checkout(app, await cartWith(app), 'unlock');
  const coupon = (await app.inject({ method: 'POST', url: '/admin/coupons', payload: {} })).json<Coupon>();
  const id = await cartWith(app);
  const before = { report: store.report(), products: store.listProducts(), coupons: store.listCoupons() };
  fail = true;
  const result = await checkout(app, id, 'recover', coupon.code);
  assert.equal(result.statusCode, 500);
  assert.deepEqual(result.json(), { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
  assert.deepEqual({ report: store.report(), products: store.listProducts(), coupons: store.listCoupons() }, before);
  fail = false;
  assert.equal((await checkout(app, id, 'recover', coupon.code)).statusCode, 201);
});

test('strict validation rejects malformed input without changing carts or stock', async t => {
  const app = appFor(t);
  const id = await cartWith(app);
  for (const payload of [
    { productId: 'pen', quantity: 0 }, { productId: 'pen', quantity: -1 },
    { productId: 'pen', quantity: 1.5 }, { productId: 'pen', quantity: '2' },
    { productId: 'pen', quantity: 10_001 }, { productId: 'pen', quantity: 1, extra: true },
    null, [], { productId: 'pen' },
  ]) {
    const result = await app.inject({ method: 'POST', url: `/carts/${id}/items`, headers: { 'content-type': 'application/json' }, payload: JSON.stringify(payload) });
    assert.equal(result.statusCode, 400);
    assert.equal(result.json<ErrorBody>().error.code, 'VALIDATION_ERROR');
  }
  const missingKey = await app.inject({ method: 'POST', url: `/carts/${id}/checkout`, payload: {} });
  assert.equal(missingKey.statusCode, 400);
  const unknownField = await app.inject({ method: 'POST', url: `/carts/${id}/checkout`, headers: { 'idempotency-key': 'unknown' }, payload: { unexpected: true } });
  assert.equal(unknownField.statusCode, 400);
  assert.equal((await app.inject(`/carts/${id}`)).json<CartView>().items[0]?.quantity, 1);
  const malformed = await app.inject({ method: 'POST', url: '/carts', headers: { 'content-type': 'application/json' }, payload: '{bad' });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json<ErrorBody>().error.code, 'MALFORMED_REQUEST');
  const oversized = await app.inject({ method: 'POST', url: '/carts', payload: { large: 'a'.repeat(20_000) } });
  assert.equal(oversized.statusCode, 413);
  assert.equal((await app.inject({ method: 'POST', url: '/carts', headers: { 'content-type': 'text/plain' }, payload: 'hi' })).statusCode, 415);
});

test('resource and state failures have distinguishable stable error codes', async t => {
  const app = appFor(t);
  for (const [url, code] of [['/carts/missing', 'CART_NOT_FOUND'], ['/orders/missing', 'ORDER_NOT_FOUND'], ['/unknown', 'ROUTE_NOT_FOUND']]) {
    const result = await app.inject(url!);
    assert.equal(result.statusCode, 404);
    assert.equal(result.json<ErrorBody>().error.code, code);
  }
  const id = (await app.inject({ method: 'POST', url: '/carts', payload: {} })).json<CartView>().id;
  assert.equal((await checkout(app, id, 'empty')).json<ErrorBody>().error.code, 'EMPTY_CART');
  assert.equal((await app.inject({ method: 'POST', url: `/carts/${id}/items`, payload: { productId: 'missing', quantity: 1 } })).json<ErrorBody>().error.code, 'PRODUCT_NOT_FOUND');
  assert.equal((await app.inject({ method: 'DELETE', url: `/carts/${id}/items/pen` })).json<ErrorBody>().error.code, 'ITEM_NOT_FOUND');
  assert.equal((await app.inject({ method: 'PATCH', url: '/admin/products/pen', payload: {} })).statusCode, 400);
});
