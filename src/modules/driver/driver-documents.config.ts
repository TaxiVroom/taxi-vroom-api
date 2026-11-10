// The timing of the documents of the drivers, in one place: read by the
// state query and by the scheduling of the jobs, outside the domain. Plain
// values only: prisma/seed.ts imports this file too. Spec
// docs/specs/documents-du-chauffeur.md, points 3, 12 and 13.

// "À renouveler" from this many days before the end of validity.
export const documentRenewalNoticeDays = 30;

// The reminders before an expiry or a deadline, in days.
export const documentReminderDaysBefore = [30, 7, 1];

export const documentTasks = {
  // A document expires soon: { driverId, documentTypeId, daysBefore }.
  reminder: 'document-reminder',
  // A document expires: { driverId, documentTypeId }.
  expiry: 'document-expiry',
  // A new type's deadline comes: { documentTypeId, daysBefore }.
  typeReminder: 'document-type-reminder',
  // A new type is required: { documentTypeId }.
  typeDeadline: 'document-type-deadline',
  // A new type was added: { documentTypeId }.
  typeAdded: 'document-type-added',
  // A sent document was validated by the admin: { driverId, documentTypeId }.
  validated: 'document-validated-push',
};

export const documentJobKeys = {
  reminder: (driverId: string, typeId: string, daysBefore: number): string =>
    `document:${driverId}:${typeId}:${daysBefore}`,
  expiry: (driverId: string, typeId: string): string =>
    `document:${driverId}:${typeId}:expiry`,
  typeReminder: (typeId: string, daysBefore: number): string =>
    `document-type:${typeId}:${daysBefore}`,
  typeDeadline: (typeId: string): string => `document-type:${typeId}:deadline`,
  typeAdded: (typeId: string): string => `document-type:${typeId}:added`,
  validated: (driverId: string, typeId: string): string =>
    `document:${driverId}:${typeId}:validated`,
};
