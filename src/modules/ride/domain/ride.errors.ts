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

// Only the driver who accepted the ride can move it on.
export class RideNotAssignedToDriverError extends ExceptionBase {
  static readonly message = 'This ride is not assigned to this driver';

  readonly code = 'RIDE.NOT_ASSIGNED_TO_DRIVER';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideNotAssignedToDriverError.message, cause, metadata);
  }
}

// The ride is not at the step this action needs, e.g. starting before the
// driver arrived.
export class RideWrongStepError extends ExceptionBase {
  static readonly message = 'The ride is not at the right step for this';

  readonly code = 'RIDE.WRONG_STEP';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideWrongStepError.message, cause, metadata);
  }
}

export class WrongBoardingCodeError extends ExceptionBase {
  static readonly message = 'Wrong boarding code';

  readonly code = 'RIDE.WRONG_BOARDING_CODE';

  constructor(readonly attemptsLeft: number, cause?: Error) {
    super(WrongBoardingCodeError.message, cause, { attemptsLeft });
  }
}

// Only the passenger who ordered the ride can cancel it.
export class RideNotOwnedByPassengerError extends ExceptionBase {
  static readonly message = 'This ride is not this passenger’s';

  readonly code = 'RIDE.NOT_OWNED_BY_PASSENGER';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideNotOwnedByPassengerError.message, cause, metadata);
  }
}

// The driver must wait a while at the pickup before reporting the passenger
// absent.
export class NoShowTooEarlyError extends ExceptionBase {
  static readonly message = 'Too early to report the passenger absent';

  readonly code = 'RIDE.NO_SHOW_TOO_EARLY';

  constructor(cause?: Error, metadata?: unknown) {
    super(NoShowTooEarlyError.message, cause, metadata);
  }
}

// No tariffs are known for the département of the pickup: the app does not
// work there yet.
export class RideAreaNotServedError extends ExceptionBase {
  static readonly message = 'Rides are not available in this area yet';

  readonly code = 'RIDE.AREA_NOT_SERVED';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideAreaNotServedError.message, cause, metadata);
  }
}

// No free taxi within reach: the price cannot include its approach.
export class NoDriverAvailableError extends ExceptionBase {
  static readonly message = 'No taxi is available around the pickup';

  readonly code = 'RIDE.NO_DRIVER_AVAILABLE';

  constructor(cause?: Error, metadata?: unknown) {
    super(NoDriverAvailableError.message, cause, metadata);
  }
}

// The estimate is too old to be ordered: the taxis moved, the traffic
// changed.
export class RideEstimateExpiredError extends ExceptionBase {
  static readonly message = 'The estimate expired, ask for a new one';

  readonly code = 'RIDE.ESTIMATE_EXPIRED';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideEstimateExpiredError.message, cause, metadata);
  }
}

// A ride is rated once, for good.
export class RideAlreadyRatedError extends ExceptionBase {
  static readonly message = 'This ride was already rated';

  readonly code = 'RIDE.ALREADY_RATED';

  constructor(cause?: Error, metadata?: unknown) {
    super(RideAlreadyRatedError.message, cause, metadata);
  }
}

// Too many wrong codes: the driver calls the passenger, or cancels.
export class BoardingCodeLockedError extends ExceptionBase {
  static readonly message = 'Too many wrong boarding codes';

  readonly code = 'RIDE.BOARDING_CODE_LOCKED';

  constructor(cause?: Error, metadata?: unknown) {
    super(BoardingCodeLockedError.message, cause, metadata);
  }
}
