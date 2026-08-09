/**
 * Domain errors. The core never imports HTTP, so it signals failure with these
 * types; transport adapters decide how to represent them (status codes, etc.).
 */

export class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message) {
    super(message, 'validation');
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Not found.') {
    super(message, 'not_found');
  }
}

export class AuthError extends DomainError {
  constructor(message = 'Not authorised.') {
    super(message, 'auth');
  }
}

/** Stable mapping used by any transport that speaks in status codes. */
export const ERROR_STATUS = {
  validation: 400,
  auth: 401,
  not_found: 404,
};
