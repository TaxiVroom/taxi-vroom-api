export enum SavedPlaceKind {
  home = 'HOME',
  work = 'WORK',
}

// Chosen in the app from Mapbox, like a ride's destination.
export interface SavedPlaceLocation {
  // e.g. "4 Rue de la Magel, 67000 Strasbourg, France".
  address: string;
  latitude: number;
  longitude: number;
}

export interface PassengerSavedPlaceProps extends SavedPlaceLocation {
  passengerId: string;
  kind: SavedPlaceKind;
}
