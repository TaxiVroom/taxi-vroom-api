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
  // "Votre taxi": the vehicle the passengers will look for.
  VEHICLE = 'VEHICLE',
  DOCUMENTS = 'DOCUMENTS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  // Explicit step so the mobile knows immediately it must show the correction
  // screen, without having to guess from the document data.
  DOCUMENTS_CORRECTION = 'DOCUMENTS_CORRECTION',
  COMPLETE = 'COMPLETE',
}

export enum VehicleColor {
  black = 'BLACK',
  white = 'WHITE',
  grey = 'GREY',
  silver = 'SILVER',
  blue = 'BLUE',
  red = 'RED',
  green = 'GREEN',
  beige = 'BEIGE',
  brown = 'BROWN',
  other = 'OTHER',
}

// What the passenger sees to recognize the taxi. Spec
// docs/specs/vehicule-du-chauffeur.md.
export interface RegistrationVehicle {
  // Make and model in one, e.g. "Renault Austral".
  model: string;
  color: VehicleColor;
  // Current French format, e.g. "AB-123-CD".
  plate: string;
  // The autorisation de stationnement, the "Taxi n° 118".
  adsNumber: string;
  // The commune de rattachement: its INSEE code and its name.
  communeCode: string;
  communeName: string;
  // From 1 to 8: a taxi has eight seats at most. Spec
  // docs/specs/nombre-de-passagers.md.
  passengerSeats: number;
}

// Whether another driver or registration already has the plate, or the taxi
// number in the commune. Spec docs/specs/vehicule-du-chauffeur.md, point 7.
export interface VehicleAvailability {
  plateTaken: boolean;
  licenceTaken: boolean;
}

export interface DriverRegistrationProps extends RegistrationBaseProps {
  currentStep: DriverRegistrationStep;
  // Null until the "Votre taxi" step.
  vehicle: RegistrationVehicle | null;
}
