export interface Product { id: string; name: string; unitPriceCents: number; available: number }
export class DomainError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}
export class Store {
  constructor() { throw new Error('Store transactions are not implemented yet'); }
}
