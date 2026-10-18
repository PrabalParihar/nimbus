import { buildApp } from './app.js';
import { readConfig } from './config.js';
import { Store } from './store.js';

try {
  // Read only these four public configuration settings, never credentials.
  const config = readConfig({ PORT: process.env.PORT, HOST: process.env.HOST, REWARD_EVERY: process.env.REWARD_EVERY, DISCOUNT_PERCENT: process.env.DISCOUNT_PERCENT });
  const app = buildApp(new Store(config));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
  }
  const address = await app.listen({ port: config.port, host: config.host });
  console.log(`Checkout service listening at ${address}`);
} catch {
  console.error('Startup failed. Check HOST, PORT, REWARD_EVERY and DISCOUNT_PERCENT and port availability.');
  process.exitCode = 1;
}
