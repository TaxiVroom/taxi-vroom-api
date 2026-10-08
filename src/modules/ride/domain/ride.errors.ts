import { ExceptionBase } from '@libs/exceptions';

export class RideNotFoundError extends ExceptionBase {
  static readonly message = 'Ride not found';

  readonly code = 'RIDE.NOT_FOUND';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideNotFoundError.message, cause, metadata);
  }
}

// The ride is no longer looking for a driver: taken, or given up.
export class RideNotSearchingDriverError extends ExceptionBase {
  static readonly message = 'The ride is no longer looking for a driver';

  readonly code = 'RIDE.NOT_SEARCHING_DRIVER';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideNotSearchingDriverError.message, cause, metadata);
  }
}

// The ride is proposed to one driver at a time: their answer comes first.
export class RideOfferAlreadyPendingError extends ExceptionBase {
  static readonly message = 'The ride is already waiting for a driver answer';

  readonly code = 'RIDE.OFFER_ALREADY_PENDING';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideOfferAlreadyPendingError.message, cause, metadata);
  }
}

// No answer is expected from this driver, or for this offer: it was already
// answered, or it expired.
export class RideOfferNotPendingError extends ExceptionBase {
  static readonly message =
    'This ride offer is no longer waiting for an answer';

  readonly code = 'RIDE.OFFER_NOT_PENDING';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideOfferNotPendingError.message, cause, metadata);
  }
}
