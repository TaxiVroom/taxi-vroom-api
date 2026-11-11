import { Command, CommandProps } from '@libs/ddd';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';

export class AddSavedPlaceCommand extends Command {
  readonly passengerId: string;
  readonly kind: SavedPlaceKind;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;

  constructor(props: CommandProps<AddSavedPlaceCommand>) {
    super(props);
    this.passengerId = props.passengerId;
    this.kind = props.kind;
    this.address = props.address;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }
}
