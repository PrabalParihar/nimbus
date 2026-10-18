import Fastify from 'fastify';
import { z } from 'zod';
import { addItemBody, checkoutBody, emptyBody, identifier, productPatch, setItemBody } from './contracts.js';
import { DomainError, Store } from './store.js';

const cartParams = z.strictObject({ cartId: identifier });
const itemParams = z.strictObject({ cartId: identifier, productId: identifier });
const orderParams = z.strictObject({ orderId: identifier });
const productParams = z.strictObject({ productId: identifier });
function optionalBody(body: unknown): unknown { return body === undefined ? {} : body; }

export function buildApp(store = new Store()) {
  const app = Fastify({ logger: false, bodyLimit: 16_384 });
  app.removeContentTypeParser('text/plain');
  app.addHook('preValidation', async request => { emptyBody.parse(request.query); });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.status).send({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
    }
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: {
        code: 'VALIDATION_ERROR', message: 'Request validation failed',
        details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      } });
    }
    if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      const code = error.statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : error.statusCode === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'MALFORMED_REQUEST';
      return reply.code(error.statusCode).send({ error: { code, message: 'Request could not be parsed' } });
    }
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route does not exist' } }));

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/config', async () => store.getConfig());
  app.get('/products', async () => store.listProducts());
  app.post('/carts', async (request, reply) => {
    emptyBody.parse(optionalBody(request.body));
    const cart = store.createCart();
    return reply.code(201).header('Location', `/carts/${cart.id}`).send(cart);
  });
  app.get('/carts/:cartId', async request => store.getCart(cartParams.parse(request.params).cartId));
  app.post('/carts/:cartId/items', async request => {
    const { cartId } = cartParams.parse(request.params);
    const body = addItemBody.parse(request.body);
    return store.addItem(cartId, body.productId, body.quantity);
  });
  app.put('/carts/:cartId/items/:productId', async request => {
    const { cartId, productId } = itemParams.parse(request.params);
    return store.setItem(cartId, productId, setItemBody.parse(request.body).quantity);
  });
  app.delete('/carts/:cartId/items/:productId', async request => {
    emptyBody.parse(optionalBody(request.body));
    const { cartId, productId } = itemParams.parse(request.params);
    return store.removeItem(cartId, productId);
  });
  app.post('/carts/:cartId/checkout', async (request, reply) => {
    const { cartId } = cartParams.parse(request.params);
    const body = checkoutBody.parse(optionalBody(request.body));
    const key = identifier.parse(request.headers['idempotency-key']);
    const { order, replayed } = store.checkout(cartId, key, body.couponCode);
    return reply.code(replayed ? 200 : 201)
      .header('Location', `/orders/${order.id}`)
      .header('Idempotency-Replayed', String(replayed)).send(order);
  });
  app.get('/orders', async () => store.listOrders());
  app.get('/orders/:orderId', async request => store.getOrder(orderParams.parse(request.params).orderId));

  // Administrative operations. No authentication in this take-home service.
  app.patch('/admin/products/:productId', async request => {
    return store.updateProduct(productParams.parse(request.params).productId, productPatch.parse(request.body));
  });
  app.post('/admin/coupons', async (request, reply) => {
    emptyBody.parse(optionalBody(request.body));
    return reply.code(201).send(store.generateCoupon());
  });
  app.get('/admin/coupons', async () => store.listCoupons());
  app.get('/admin/report', async () => store.report());
  return app;
}
