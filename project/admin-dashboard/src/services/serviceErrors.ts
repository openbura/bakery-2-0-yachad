export class OwnerFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OwnerFacingError';
  }
}

export function ownerMessage(error: unknown, fallback: string) {
  return error instanceof OwnerFacingError ? error.message : fallback;
}
