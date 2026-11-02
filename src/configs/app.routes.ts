/**
 * Application routes with its version
 * https://github.com/Sairyss/backend-best-practices#api-versioning
 */

// Root
const usersRoot = 'users';
const walletsRoot = 'wallets';
const registrationFlowsRoot = 'registration-flows';
const passengersRoot = 'passengers';
const registrationDocumentTypesRoot = 'registration-document-types';
const adminRoot = 'admin';
const ridesRoot = 'rides';

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
    documents: `${registrationFlowsRoot}/me/documents`,
    documentUrl: `${registrationFlowsRoot}/me/documents/:documentTypeId/url`,
  },
  registrationDocumentType: {
    root: registrationDocumentTypesRoot,
  },
  passenger: {
    root: passengersRoot,
  },
  notification: {
    pushRegistration: 'me/push-registration',
  },
  admin: {
    validateRegistrationDocument: `${adminRoot}/registration-documents/:documentId/validate`,
  },
  ride: {
    root: ridesRoot,
    current: `${ridesRoot}/current`,
    request: `${ridesRoot}/:rideId/request`,
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
