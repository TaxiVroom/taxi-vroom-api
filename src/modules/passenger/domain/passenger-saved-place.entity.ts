import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentNotProvidedException } from '@libs/exceptions';
import {
  PassengerSavedPlaceProps,
  SavedPlaceKind,
  SavedPlaceLocation,
} from './passenger-saved-place.types';

export interface CreatePassengerSavedPlaceProps {
  passengerId: string;
  kind: SavedPlaceKind;
  location: SavedPlaceLocation;
}

// "Maison" or "Travail" of a passenger: a destination in one tap.
export class PassengerSavedPlaceEntity extends AggregateRoot<PassengerSavedPlaceProps> {
  protected readonly _id: AggregateID;

  static create(
    props: CreatePassengerSavedPlaceProps,
  ): PassengerSavedPlaceEntity {
    return PassengerSavedPlaceEntity.restore({
      passengerId: props.passengerId,
      kind: props.kind,
      ...props.location,
    });
  }

  static restore(props: PassengerSavedPlaceProps): PassengerSavedPlaceEntity {
    // One place of each kind per passenger: the pair is its identity.
    return new PassengerSavedPlaceEntity({
      id: `${props.passengerId}:${props.kind}`,
      props,
    });
  }

  // The passenger chose another address for this place.
  moveTo(location: SavedPlaceLocation): void {
    this.props.address = location.address;
    this.props.latitude = location.latitude;
    this.props.longitude = location.longitude;
    this.validate();
  }

  // A saved place is used for every ride: never without its address.
  validate(): void {
    if (!this.props.address.trim()) {
      throw new ArgumentNotProvidedException('Saved place: address');
    }
  }
}
