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

// Api Versions
const v1 = 'v1';

export const routesV1 = {
  version: v1,
  user: {
    root: usersRoot,
    delete: `/${usersRoot}/:id`,
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
  admin: {
    validateRegistrationDocument: `${adminRoot}/registration-documents/:documentId/validate`,
  },
};
