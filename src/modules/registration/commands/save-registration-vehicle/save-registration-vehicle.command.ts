import { Command, CommandProps } from '@libs/ddd';
import { VehicleColor } from '@modules/registration/domain/registration.types';

export class SaveRegistrationVehicleCommand extends Command {
  readonly userId: string;
  readonly model: string;
  readonly color: VehicleColor;
  readonly plate: string;
  readonly adsNumber: string;
  readonly communeCode: string;
  readonly communeName: string;

  constructor(props: CommandProps<SaveRegistrationVehicleCommand>) {
    super(props);
    this.userId = props.userId;
    this.model = props.model;
    this.color = props.color;
    this.plate = props.plate;
    this.adsNumber = props.adsNumber;
    this.communeCode = props.communeCode;
    this.communeName = props.communeName;
  }
}
