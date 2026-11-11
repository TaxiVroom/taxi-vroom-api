import { Command, CommandProps } from '@libs/ddd';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';

export class DeleteSavedPlaceCommand extends Command {
  readonly passengerId: string;
  readonly kind: SavedPlaceKind;

  constructor(props: CommandProps<DeleteSavedPlaceCommand>) {
    super(props);
    this.passengerId = props.passengerId;
    this.kind = props.kind;
  }
}
