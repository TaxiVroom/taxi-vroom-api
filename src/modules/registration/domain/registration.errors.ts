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

export class RegistrationNotDriverError extends ExceptionBase {
  static readonly message = 'Only a driver registration has a vehicle';
  public readonly code = 'REGISTRATION.NOT_DRIVER';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationNotDriverError.message, cause, metadata);
  }
}

export class RegistrationAlreadyCompleteError extends ExceptionBase {
  static readonly message = 'The registration is complete: it cannot change';
  public readonly code = 'REGISTRATION.ALREADY_COMPLETE';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationAlreadyCompleteError.message, cause, metadata);
  }
}

export class RegistrationVehiclePlateInvalidError extends ExceptionBase {
  static readonly message = 'Plaque au format AB-123-CD';
  public readonly code = 'REGISTRATION.VEHICLE_PLATE_INVALID';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationVehiclePlateInvalidError.message, cause, metadata);
  }
}

// Another driver or registration has this plate. Spec
// docs/specs/vehicule-du-chauffeur.md, point 7.
export class RegistrationVehiclePlateTakenError extends ExceptionBase {
  static readonly message = 'Cette plaque est déjà enregistrée';
  public readonly code = 'REGISTRATION.VEHICLE_PLATE_TAKEN';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationVehiclePlateTakenError.message, cause, metadata);
  }
}

// Another driver or registration has this taxi number in this commune.
export class RegistrationVehicleLicenceTakenError extends ExceptionBase {
  static readonly message = 'Ce numéro de taxi est déjà enregistré';
  public readonly code = 'REGISTRATION.VEHICLE_LICENCE_TAKEN';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationVehicleLicenceTakenError.message, cause, metadata);
  }
}

export class RegistrationMissingPhoneError extends ExceptionBase {
  static readonly message = 'Phone number is required to complete registration';
  public readonly code = 'REGISTRATION.MISSING_PHONE';
  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationMissingPhoneError.message, cause, metadata);
  }
}
