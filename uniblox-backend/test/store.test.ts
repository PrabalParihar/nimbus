import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Store, DomainError, type Product } from '../src/store.js';

const products: Product[] = [
  { id: 'p1', name: 'Fictional pen', unitPriceCents: 105, available: 30 },
  { id: 'rare', name: 'Fictional limited print', unitPriceCents: 999, available: 1 },
];
function fixture(options: ConstructorParameters<typeof Store>[0] = {}) {
  return new Store({ products, rewardEvery: 1, discountPercent: 10, ...options });
}
function cartWith(store: Store, productId = 'p1', quantity = 1) {
  const cart = store.createCart();
  store.addItem(cart.id, productId, quantity);
  return cart.id;
}
function error(code: string) {
  return (value: unknown) => value instanceof DomainError && value.code === code;
}

test('validates configuration, products and quantities before changing state', () => {
  assert.throws(() => fixture({ rewardEvery: 0 }));
  assert.throws(() => fixture({ discountPercent: 101 }));
  assert.throws(() => fixture({ products: [products[0]!, products[0]!] }));
  const store = fixture();
  const id = store.createCart().id;
  assert.throws(() => store.addItem(id, 'missing', 1), error('PRODUCT_NOT_FOUND'));
  for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => store.addItem(id, 'p1', quantity));
  }
  assert.equal(store.getCart(id).items.length, 0);
  store.addItem(id, 'p1', 2);
  store.addItem(id, 'p1', 3);
  assert.equal(store.getCart(id).items[0]?.quantity, 5);
  store.setItem(id, 'p1', 4);
  assert.equal(store.getCart(id).subtotalCents, 420);
  store.removeItem(id, 'p1');
  assert.equal(store.getCart(id).subtotalCents, 0);
  assert.throws(() => store.setItem(id, 'p1', 2), error('ITEM_NOT_FOUND'));
  assert.throws(() => store.checkout(id, 'empty'), error('EMPTY_CART'));
});

test('checkout uses live price/stock, snapshots its order and detaches returned objects', () => {
  const store = fixture();
  const id = cartWith(store, 'p1', 2);
  store.updateProduct('p1', { name: 'New fictional pen', unitPriceCents: 109, available: 2 });
  assert.equal(store.getCart(id).subtotalCents, 218);
  const { order } = store.checkout(id, 'first');
  assert.equal(order.subtotalCents, 218);
  assert.equal(order.items[0]?.productName, 'New fictional pen');
  assert.equal(store.listProducts().find(p => p.id === 'p1')?.available, 0);
  store.updateProduct('p1', { name: 'Later name', unitPriceCents: 999, available: 8 });
  order.items[0]!.productName = 'client mutation';
  order.totalCents = 0;
  assert.equal(store.getOrder(order.id).totalCents, 218);
  assert.equal(store.getOrder(order.id).items[0]?.productName, 'New fictional pen');
  const view = store.getCart(id);
  assert.equal(view.items[0]?.unitPriceCents, 109);
  assert.equal(view.status, 'checked_out');
  assert.throws(() => store.addItem(id, 'p1', 1), error('CART_CLOSED'));
  assert.throws(() => store.setItem(id, 'p1', 1), error('CART_CLOSED'));
  assert.throws(() => store.removeItem(id, 'p1'), error('CART_CLOSED'));
});

test('idempotent retries return one snapshot; reused keys and new keys cannot duplicate orders', () => {
  const store = fixture();
  const id = cartWith(store);
  const first = store.checkout(id, 'retry');
  assert.equal(first.replayed, false);
  store.updateProduct('p1', { unitPriceCents: 1000 });
  assert.deepEqual(store.checkout(id, 'retry'), { order: first.order, replayed: true });
  assert.throws(() => store.checkout(id, 'different'), error('CART_CLOSED'));
  assert.throws(() => store.checkout(id, 'retry', 'changed-coupon'), error('IDEMPOTENCY_CONFLICT'));
  assert.throws(() => store.checkout(cartWith(store), 'retry'), error('IDEMPOTENCY_CONFLICT'));
  assert.equal(store.report().totalOrders, 1);
});

test('failed checkout preserves all inventory, coupon and cart; the same key can retry', () => {
  const store = fixture();
  store.checkout(cartWith(store), 'unlock');
  const coupon = store.generateCoupon();
  const id = cartWith(store, 'p1', 2);
  store.addItem(id, 'rare', 2);
  const before = store.report();
  assert.throws(() => store.checkout(id, 'recover', coupon.code), error('INSUFFICIENT_STOCK'));
  assert.deepEqual(store.report(), before);
  assert.equal(store.listProducts().find(p => p.id === 'p1')?.available, 29);
  assert.equal(store.getCart(id).status, 'open');
  assert.equal(store.listCoupons()[0]?.redeemedByOrderId, null);
  store.setItem(id, 'rare', 1);
  const result = store.checkout(id, 'recover', coupon.code);
  assert.equal(result.order.discountCents, 121);
  assert.equal(store.listCoupons()[0]?.redeemedByOrderId, result.order.id);
});

test('unexpected late failure rolls back staged deductions, coupon use, order and retry key', () => {
  let fail = false;
  const store = fixture({ now: () => { if (fail) throw new Error('clock failed'); return new Date('2026-01-01T00:00:00Z'); } });
  store.checkout(cartWith(store), 'unlock');
  const coupon = store.generateCoupon();
  const id = cartWith(store, 'p1', 3);
  const before = { report: store.report(), products: store.listProducts(), coupons: store.listCoupons(), cart: store.getCart(id) };
  fail = true;
  assert.throws(() => store.checkout(id, 'late-retry', coupon.code), /clock failed/);
  assert.deepEqual({ report: store.report(), products: store.listProducts(), coupons: store.listCoupons(), cart: store.getCart(id) }, before);
  fail = false;
  assert.equal(store.checkout(id, 'late-retry', coupon.code).order.totalCents, 283);
});

test('milestones are global, generated once, oldest first, only after successful orders', () => {
  const store = fixture({ rewardEvery: 2 });
  assert.throws(() => store.generateCoupon(), error('NO_ELIGIBLE_MILESTONE'));
  for (let i = 0; i < 5; i++) store.checkout(cartWith(store), `order-${i}`);
  assert.equal(store.generateCoupon().milestone, 2);
  assert.equal(store.generateCoupon().milestone, 4);
  assert.throws(() => store.generateCoupon(), error('NO_ELIGIBLE_MILESTONE'));
  assert.equal(store.report().coupons.generated, 2);
  assert.equal(store.report().totalOrders, 5);
});

test('rounds once on the subtotal, half up; 100% discounts never make totals negative', () => {
  const store = fixture();
  store.checkout(cartWith(store), 'unlock');
  const coupon = store.generateCoupon();
  const order = store.checkout(cartWith(store), 'discount', coupon.code).order;
  assert.equal(order.discountCents, 11);
  assert.equal(order.totalCents, 94);
  const free = fixture({ discountPercent: 100 });
  free.checkout(cartWith(free), 'unlock');
  assert.equal(free.checkout(cartWith(free), 'free', free.generateCoupon().code).order.totalCents, 0);
});

test('invalid and redeemed coupons reject without consuming stock or closing the cart', () => {
  const store = fixture();
  store.checkout(cartWith(store), 'unlock');
  const coupon = store.generateCoupon();
  const id = cartWith(store);
  assert.throws(() => store.checkout(id, 'bad', 'no-coupon'), error('COUPON_NOT_FOUND'));
  store.checkout(cartWith(store), 'use', coupon.code);
  assert.throws(() => store.checkout(id, 'bad', coupon.code), error('COUPON_REDEEMED'));
  assert.equal(store.getCart(id).status, 'open');
  assert.equal(store.report().totalOrders, 2);
});

test('reports reconcile with returned orders/coupons and remain read-only and detached', () => {
  const store = fixture({ rewardEvery: 2 });
  const orders = [store.checkout(cartWith(store, 'p1', 2), 'one').order, store.checkout(cartWith(store, 'rare'), 'two').order];
  const coupon = store.generateCoupon();
  orders.push(store.checkout(cartWith(store), 'three', coupon.code).order);
  const report = store.report();
  assert.equal(report.grossRevenueCents, orders.reduce((n, o) => n + o.subtotalCents, 0));
  assert.equal(report.totalDiscountsCents, orders.reduce((n, o) => n + o.discountCents, 0));
  assert.equal(report.netRevenueCents, report.grossRevenueCents - report.totalDiscountsCents);
  assert.deepEqual(report.purchasedQuantityByProduct, { p1: 3, rare: 1 });
  assert.deepEqual(report.coupons, { generated: 1, available: 0, redeemed: 1 });
  assert.equal(report.totalOrders, 3);
  const before = structuredClone(report);
  report.purchasedQuantityByProduct.p1 = 999;
  assert.deepEqual(store.report(), before);
  assert.deepEqual(store.report(), before);
  assert.equal(store.listOrders().length, orders.length);
});

test('rejects unsafe prices and quantities, and adds exact integer totals at supported limits', () => {
  const store = fixture();
  assert.throws(() => store.updateProduct('p1', { unitPriceCents: Number.MAX_SAFE_INTEGER }));
  assert.throws(() => store.updateProduct('p1', { unitPriceCents: 1.1 }));
  assert.throws(() => store.updateProduct('p1', { available: -1 }));
  store.updateProduct('p1', { unitPriceCents: 1_000_000_000, available: 10_000 });
  const order = store.checkout(cartWith(store, 'p1', 10_000), 'large').order;
  assert.equal(order.totalCents, 10_000_000_000_000);
  assert.equal(store.report().netRevenueCents, order.totalCents);
});
