import { ExceptionBase } from '@libs/exceptions';

// One "Maison" and one "Travail" at most per passenger.
export class SavedPlaceAlreadyExistsError extends ExceptionBase {
  static readonly message = 'This saved place already exists';

  readonly code = 'SAVED_PLACE.ALREADY_EXISTS';

  constructor(cause?: Error, metadata?: unknown) {
    super(SavedPlaceAlreadyExistsError.message, cause, metadata);
  }
}

export class SavedPlaceNotFoundError extends ExceptionBase {
  static readonly message = 'Saved place not found';

  readonly code = 'SAVED_PLACE.NOT_FOUND';

  constructor(cause?: Error, metadata?: unknown) {
    super(SavedPlaceNotFoundError.message, cause, metadata);
  }
}
