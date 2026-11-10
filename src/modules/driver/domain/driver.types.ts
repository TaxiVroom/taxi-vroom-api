// What the passenger sees to recognize the taxi, e.g. "Renault Austral",
// GREY, "AB-123-CD", taxi n° "118" in Strasbourg ("67482"). Spec
// docs/specs/vehicule-du-chauffeur.md.
export interface DriverVehicle {
  model: string;
  color: string;
  plate: string;
  adsNumber: string;
  communeCode: string;
  communeName: string;
}

// A document of the driver, validated at the registration. The files stay
// where the registration put them in the storage. Spec
// docs/specs/inscription-chauffeur.md.
export interface DriverDocument {
  id: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  // Null when the document type does not expire.
  expiresAt: Date | null;
}

// A validated document of the registration, before it is the driver's.
export interface CreateDriverDocumentProps {
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  expiresAt: Date | null;
}

export interface DriverProps {
  userId: string;
  // Null for a driver registered before the "Votre taxi" step existed.
  vehicle: DriverVehicle | null;
  // Empty for a driver created before the documents were copied.
  documents: DriverDocument[];
}

export interface CreateDriverProps {
  userId: string;
  // The vehicle of the registration, copied when the driver is created.
  vehicle: DriverVehicle | null;
  // The validated documents of the registration, copied with it.
  documents: CreateDriverDocumentProps[];
}
