/**
 * Application routes with its version
 * https://github.com/Sairyss/backend-best-practices#api-versioning
 */

// Root
const usersRoot = 'users';
const walletsRoot = 'wallets';
const registrationFlowsRoot = 'registration-flows';
const passengersRoot = 'passengers';
const driversRoot = 'drivers';
const registrationDocumentTypesRoot = 'registration-document-types';
const adminRoot = 'admin';
const ridesRoot = 'rides';
const bookingsRoot = 'bookings';
const enterpriseContactRoot = 'enterprise-contact';

// Api Versions
const v1 = 'v1';

export const routesV1 = {
  version: v1,
  user: {
    root: usersRoot,
    delete: `/${usersRoot}/:id`,
    me: 'me',
  },
  wallet: {
    root: walletsRoot,
    delete: `/${walletsRoot}/:id`,
  },
  registrationFlow: {
    me: `${registrationFlowsRoot}/me`,
    emailAvailability: `${registrationFlowsRoot}/me/email-availability`,
    vehicle: `${registrationFlowsRoot}/me/vehicle`,
    pushToken: `${registrationFlowsRoot}/me/push-token`,
    documents: `${registrationFlowsRoot}/me/documents`,
    documentUrl: `${registrationFlowsRoot}/me/documents/:documentTypeId/url`,
  },
  registrationDocumentType: {
    root: registrationDocumentTypesRoot,
  },
  passenger: {
    root: passengersRoot,
    savedPlaces: 'me/saved-places',
    savedPlace: 'me/saved-places/:kind',
  },
  driver: {
    account: `${driversRoot}/me/account`,
    documents: `${driversRoot}/me/documents`,
    document: `${driversRoot}/me/documents/:documentTypeId`,
    online: `${driversRoot}/me/online`,
    earnings: `${driversRoot}/me/earnings`,
    activity: `${driversRoot}/me/activity`,
  },
  notification: {
    pushRegistration: 'me/push-registration',
  },
  admin: {
    validateRegistrationDocument: `${adminRoot}/registration-documents/:documentId/validate`,
    validateDriverDocument: `${adminRoot}/driver-documents/:submissionId/validate`,
  },
  enterpriseContact: {
    root: enterpriseContactRoot,
  },
  booking: {
    available: `${bookingsRoot}/available`,
    accepted: `${bookingsRoot}/accepted`,
  },
  ride: {
    root: ridesRoot,
    current: `${ridesRoot}/current`,
    booked: `${ridesRoot}/booked`,
    recentDestinations: `${ridesRoot}/recent-destinations`,
    request: `${ridesRoot}/:rideId/request`,
    book: `${ridesRoot}/:rideId/book`,
    acceptBooking: `${ridesRoot}/:rideId/booking/accept`,
    withdrawFromBooking: `${ridesRoot}/:rideId/booking/withdraw`,
    refuseBooking: `${ridesRoot}/:rideId/booking/refuse`,
    departForBooking: `${ridesRoot}/:rideId/booking/depart`,
    accept: `${ridesRoot}/:rideId/accept`,
    decline: `${ridesRoot}/:rideId/decline`,
    arrive: `${ridesRoot}/:rideId/arrive`,
    start: `${ridesRoot}/:rideId/start`,
    complete: `${ridesRoot}/:rideId/complete`,
    cancel: `${ridesRoot}/:rideId/cancel`,
    withdraw: `${ridesRoot}/:rideId/withdraw`,
    noShow: `${ridesRoot}/:rideId/no-show`,
    rating: `${ridesRoot}/:rideId/rating`,
    boardingCode: `${ridesRoot}/:rideId/boarding-code`,
  },
};
