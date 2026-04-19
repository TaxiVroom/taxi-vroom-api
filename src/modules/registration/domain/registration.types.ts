export enum RegistrationRole {
  passenger = 'PASSENGER',
  driver = 'DRIVER',
}

// Champs partagés par tous les flows de registration.
export interface RegistrationBaseProps {
  userId: string; // Firebase UID
  role: RegistrationRole;
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface CreateRegistrationBaseProps {
  userId: string;
  role: RegistrationRole;
  phone: string;
}

export interface UpdateRegistrationBaseProps {
  fromStep: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export type CreatePassengerRegistrationProps = CreateRegistrationBaseProps;
export type RegistrationStep =
  | DriverRegistrationStep
  | PassengerRegistrationStep;

export type CreateDriverRegistrationProps = CreateRegistrationBaseProps;

export enum PassengerRegistrationStep {
  SOCIAL_LINK = 'SOCIAL_LINK',
  EMAIL = 'EMAIL',
  NAME = 'NAME',
  NOTIFICATIONS = 'NOTIFICATIONS',
  COMPLETE = 'COMPLETE',
}

export enum DriverRegistrationStep {
  SOCIAL_LINK = 'SOCIAL_LINK',
  EMAIL = 'EMAIL',
  NAME = 'NAME',
  DOCUMENTS = 'DOCUMENTS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  // Explicit step so the mobile knows immediately it must show the correction
  // screen, without having to guess from the document data.
  DOCUMENTS_CORRECTION = 'DOCUMENTS_CORRECTION',
  COMPLETE = 'COMPLETE',
}

export interface DriverRegistrationProps extends RegistrationBaseProps {
  currentStep: DriverRegistrationStep;
}
