import { randomUUID } from 'node:crypto';
import { configSchema, identifier, productPatch, productSchema, quantity } from './contracts.js';
import type { Product, ProductPatch } from './contracts.js';
import { seedProducts } from './seed.js';
export type { Product } from './contracts.js';

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 409,
    public readonly details?: Record<string, string | number>,
  ) { super(message); }
}

export interface OrderLine {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}
export interface Order {
  id: string;
  cartId: string;
  currency: 'USD';
  items: OrderLine[];
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  couponCode: string | null;
  placedAt: string;
}
export interface Coupon {
  code: string;
  milestone: number;
  discountPercent: number;
  redeemedByOrderId: string | null;
}
export interface CartView {
  id: string;
  status: 'open' | 'checked_out';
  orderId: string | null;
  currency: 'USD';
  items: (OrderLine & { available?: number })[];
  subtotalCents: number;
}
interface Cart { id: string; items: Map<string, number>; orderId: string | null }
interface State {
  products: Map<string, Product>;
  carts: Map<string, Cart>;
  orders: Map<string, Order>;
  coupons: Map<string, Coupon>;
  retries: Map<string, { fingerprint: string; orderId: string }>;
}
interface Options {
  products?: Product[];
  rewardEvery?: number;
  discountPercent?: number;
  now?: () => Date;
}

// All public money/count outputs are exact JSON safe integers. BigInt prevents
// intermediate multiplication/rounding from silently losing precision.
function safe(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('CAPACITY_EXCEEDED', 'Exact numeric capacity exceeded');
  }
  return Number(value);
}
function required<T>(value: T | undefined, code: string, message: string): T {
  if (value === undefined) throw new DomainError(code, message, 404);
  return value;
}
function openCart(state: State, id: string): Cart {
  const cart = required(state.carts.get(id), 'CART_NOT_FOUND', 'Cart does not exist');
  if (cart.orderId !== null) throw new DomainError('CART_CLOSED', 'Cart has already been checked out');
  return cart;
}
function quote(state: State, cart: Cart): OrderLine[] {
  return [...cart.items].map(([id, count]) => {
    const product = required(state.products.get(id), 'PRODUCT_NOT_FOUND', 'Product does not exist');
    return {
      productId: id, productName: product.name, unitPriceCents: product.unitPriceCents,
      quantity: count, lineTotalCents: safe(BigInt(product.unitPriceCents) * BigInt(count)),
    };
  });
}
function sumLines(lines: OrderLine[]): number {
  return safe(lines.reduce((sum, line) => sum + BigInt(line.lineTotalCents), 0n));
}
function cartView(state: State, id: string): CartView {
  const cart = required(state.carts.get(id), 'CART_NOT_FOUND', 'Cart does not exist');
  const order = cart.orderId === null ? undefined : state.orders.get(cart.orderId)!;
  const items = order ? order.items : quote(state, cart).map(line => ({ ...line, available: state.products.get(line.productId)!.available }));
  return {
    id, status: order ? 'checked_out' : 'open', orderId: cart.orderId,
    currency: 'USD', items, subtotalCents: order ? order.subtotalCents : sumLines(items),
  };
}
function reportFrom(state: State) {
  let gross = 0n;
  let discounts = 0n;
  const quantities = new Map<string, bigint>();
  for (const order of state.orders.values()) {
    gross += BigInt(order.subtotalCents);
    discounts += BigInt(order.discountCents);
    for (const line of order.items) quantities.set(line.productId, (quantities.get(line.productId) ?? 0n) + BigInt(line.quantity));
  }
  const redeemed = [...state.coupons.values()].filter(c => c.redeemedByOrderId !== null).length;
  return {
    currency: 'USD' as const,
    totalOrders: state.orders.size,
    purchasedQuantityByProduct: Object.fromEntries([...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([id, count]) => [id, safe(count)])),
    grossRevenueCents: safe(gross), totalDiscountsCents: safe(discounts), netRevenueCents: safe(gross - discounts),
    coupons: { generated: state.coupons.size, available: state.coupons.size - redeemed, redeemed },
  };
}

export class Store {
  #state: State;
  #mutating = false;
  readonly #config: { rewardEvery: number; discountPercent: number };
  readonly #now: () => Date;

  constructor(options: Options = {}) {
    this.#config = configSchema.parse({ rewardEvery: options.rewardEvery ?? 5, discountPercent: options.discountPercent ?? 10 });
    this.#now = options.now ?? (() => new Date());
    const products = (options.products ?? seedProducts).map(product => productSchema.parse(product));
    if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('Duplicate seed product IDs');
    this.#state = { products: new Map(products.map(p => [p.id, p])), carts: new Map(), orders: new Map(), coupons: new Map(), retries: new Map() };
  }

  // The only state publication point. The callback is private and synchronous:
  // no await, external I/O or asynchronous payment inside it. The injected
  // clock must be synchronous; reject any reentrant mutation it attempts.
  // Clone the returned value BEFORE publication so even cloning failures roll back.
  #transaction<T>(work: (next: State) => T): T {
    if (this.#mutating) throw new Error('Reentrant state mutation is not allowed');
    this.#mutating = true;
    try {
      const next = structuredClone(this.#state);
      const result = structuredClone(work(next));
      this.#state = next;
      return result;
    } finally {
      this.#mutating = false;
    }
  }

  listProducts(): Product[] { return structuredClone([...this.#state.products.values()]); }
  listOrders(): Order[] { return structuredClone([...this.#state.orders.values()]); }
  listCoupons(): Coupon[] { return structuredClone([...this.#state.coupons.values()]); }
  report() { return reportFrom(this.#state); }
  getConfig() { return { ...this.#config, currency: 'USD' as const }; }
  getCart(id: string): CartView { return structuredClone(cartView(this.#state, identifier.parse(id))); }
  getOrder(id: string): Order {
    return structuredClone(required(this.#state.orders.get(identifier.parse(id)), 'ORDER_NOT_FOUND', 'Order does not exist'));
  }

  createCart(): CartView {
    return this.#transaction(next => {
      const id = randomUUID();
      if (next.carts.has(id)) throw new Error('Cart ID collision');
      next.carts.set(id, { id, items: new Map(), orderId: null });
      return cartView(next, id);
    });
  }
  addItem(cartId: string, productId: string, count: number): CartView {
    identifier.parse(cartId); identifier.parse(productId); quantity.parse(count);
    return this.#transaction(next => {
      const cart = openCart(next, cartId);
      required(next.products.get(productId), 'PRODUCT_NOT_FOUND', 'Product does not exist');
      if (!cart.items.has(productId) && cart.items.size >= 100) throw new DomainError('CART_LIMIT', 'Cart may contain at most 100 products');
      cart.items.set(productId, quantity.parse((cart.items.get(productId) ?? 0) + count));
      return cartView(next, cartId);
    });
  }
  setItem(cartId: string, productId: string, count: number): CartView {
    identifier.parse(cartId); identifier.parse(productId); quantity.parse(count);
    return this.#transaction(next => {
      const cart = openCart(next, cartId);
      if (!cart.items.has(productId)) throw new DomainError('ITEM_NOT_FOUND', 'Product is not in this cart', 404);
      cart.items.set(productId, count);
      return cartView(next, cartId);
    });
  }
  removeItem(cartId: string, productId: string): CartView {
    identifier.parse(cartId); identifier.parse(productId);
    return this.#transaction(next => {
      const cart = openCart(next, cartId);
      if (!cart.items.delete(productId)) throw new DomainError('ITEM_NOT_FOUND', 'Product is not in this cart', 404);
      return cartView(next, cartId);
    });
  }
  updateProduct(id: string, patch: ProductPatch): Product {
    identifier.parse(id);
    const parsed = productPatch.parse(patch);
    return this.#transaction(next => {
      const product = required(next.products.get(id), 'PRODUCT_NOT_FOUND', 'Product does not exist');
      const updated = productSchema.parse({ ...product, ...parsed });
      next.products.set(id, updated);
      return updated;
    });
  }

  checkout(cartId: string, idempotencyKey: string, couponCode?: string): { order: Order; replayed: boolean } {
    identifier.parse(cartId); identifier.parse(idempotencyKey);
    if (couponCode !== undefined) identifier.parse(couponCode);
    const fingerprint = JSON.stringify([cartId, couponCode ?? null]);
    return this.#transaction(next => {
      const previous = next.retries.get(idempotencyKey);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new DomainError('IDEMPOTENCY_CONFLICT', 'Key was used for a different checkout request');
        return { order: next.orders.get(previous.orderId)!, replayed: true };
      }
      const cart = openCart(next, cartId);
      if (cart.items.size === 0) throw new DomainError('EMPTY_CART', 'Add an item before checking out');
      const items = quote(next, cart);
      const coupon = couponCode === undefined ? undefined : required(next.coupons.get(couponCode), 'COUPON_NOT_FOUND', 'Coupon does not exist');
      if (coupon && coupon.redeemedByOrderId !== null) throw new DomainError('COUPON_REDEEMED', 'Coupon was already redeemed');
      for (const item of items) {
        const product = next.products.get(item.productId)!;
        if (product.available < item.quantity) throw new DomainError('INSUFFICIENT_STOCK', 'Product no longer has enough stock', 409, { productId: item.productId, requested: item.quantity, available: product.available });
      }
      const subtotalCents = sumLines(items);
      const discountPercent = coupon?.discountPercent ?? 0;
      const discountCents = safe((BigInt(subtotalCents) * BigInt(discountPercent) + 50n) / 100n);
      const id = randomUUID();
      if (next.orders.has(id)) throw new Error('Order ID collision');
      for (const item of items) next.products.get(item.productId)!.available -= item.quantity;
      if (coupon) coupon.redeemedByOrderId = id;
      cart.orderId = id;
      const order: Order = {
        id, cartId, currency: 'USD', items, subtotalCents, discountPercent, discountCents,
        totalCents: subtotalCents - discountCents, couponCode: couponCode ?? null,
        placedAt: this.#now().toISOString(),
      };
      next.orders.set(id, order);
      next.retries.set(idempotencyKey, { fingerprint, orderId: id });
      // Reject at commit time if aggregate capacity would make reports inexact.
      reportFrom(next);
      return { order, replayed: false };
    });
  }

  generateCoupon(): Coupon {
    return this.#transaction(next => {
      const rewarded = new Set([...next.coupons.values()].map(c => c.milestone));
      let milestone = this.#config.rewardEvery;
      while (rewarded.has(milestone)) milestone += this.#config.rewardEvery;
      if (milestone > next.orders.size) throw new DomainError('NO_ELIGIBLE_MILESTONE', 'No unrewarded order milestone has been reached');
      const code = `reward-${randomUUID()}`;
      if (next.coupons.has(code)) throw new Error('Coupon code collision');
      const coupon: Coupon = { code, milestone, discountPercent: this.#config.discountPercent, redeemedByOrderId: null };
      next.coupons.set(code, coupon);
      return coupon;
    });
  }
}
