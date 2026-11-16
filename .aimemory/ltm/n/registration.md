# id: registration
# tags: registration,onboarding,documents,driver,passenger,storage,user
# sum: Onboarding steps, documents, user creation chain

#N id|kind|path|note
PassengerReg|agg|src/modules/registration/domain/passenger-registration.entity.ts|NEXT_STEP map
DriverReg|agg|src/modules/registration/domain/driver-registration.entity.ts|advanceStep switch by fromStep
RegistrationDoc|agg|src/modules/registration/domain/registration-document.entity.ts|SUBMITTED, VALIDATED, REJECTED
SubmitDocuments|uc|src/modules/registration/commands/submit-registration-documents/submit-registration-documents.service.ts|upload + upsert
ValidateDocument|uc|src/modules/registration/commands/validate-registration-document/validate-registration-document.service.ts|completes the driver once all types are validated

#E from>rel>to
ValidateDocument>completes>DriverReg
SubmitDocuments>creates>RegistrationDoc

#F durable facts
passenger steps: SOCIAL_LINK, EMAIL, NAME, NOTIFICATIONS, COMPLETE; POST /v1/passengers finalizes
driver steps: SOCIAL_LINK, EMAIL, NAME, DOCUMENTS, PENDING_REVIEW, COMPLETE, with DOCUMENTS_CORRECTION as an unused branch
Registration is keyed by the Firebase UID, with no FK to User: the User row only exists after completion
GET registration-flows/me is a command: it gets or creates the flow, a race falls back on the existing row
PATCH advances from the step the client declares, not the stored one, so going back is idempotent
complete() is idempotent: an already COMPLETE registration creates nothing
completion needs email, firstName, lastName, phone, then raises RegistrationCompleted with the Firebase UID as user id
email availability checks User and Registration, ignoring the requesting user
documents: one per (driverRegId, documentTypeId); back required by DocumentType.backRequired unless already uploaded; resubmitting keeps the stored side when no new file comes
storage path: drivers/<uid>/<document-type-slug>/<side>.<ext>; the mobile always sends JPEG, so a new file overwrites the old one
signed URLs last 15 minutes; get-registration-document-url injects repository ports, an exception to the CQRS read rule
driver validation: each document validated by the admin route; when every DocumentType has a VALIDATED document, the registration completes
document types come from prisma/seed.ts: permis, carte grise (front only), carte professionnelle, carte d'identité
to validate a test driver: read registration_documents ids, then PATCH each with the Firebase token of the admin account (users.role ADMIN)
