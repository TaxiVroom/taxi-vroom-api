import { ExceptionBase } from '@libs/exceptions';

export class RegistrationNotFoundError extends ExceptionBase {
  static readonly message = 'Registration not found';
  public readonly code = 'REGISTRATION.NOT_FOUND';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationNotFoundError.message, cause, metadata);
  }
}

export class RegistrationNotCompleteError extends ExceptionBase {
  static readonly message = 'Registration is not complete yet';
  public readonly code = 'REGISTRATION.NOT_COMPLETE';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationNotCompleteError.message, cause, metadata);
  }
}

export class RegistrationMissingPhoneError extends ExceptionBase {
  static readonly message = 'Phone number is required to complete registration';
  public readonly code = 'REGISTRATION.MISSING_PHONE';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationMissingPhoneError.message, cause, metadata);
  }
}
