import { PassengerRegistrationEntity } from './passenger-registration.entity';
import {
  PassengerRegistrationStep,
  RegistrationRole,
} from './registration.types';

describe('PassengerRegistrationEntity', () => {
  let registration: PassengerRegistrationEntity;

  beforeEach(() => {
    registration = new PassengerRegistrationEntity({
      id: 'registration-id',
      props: {
        userId: 'firebase-uid',
        role: RegistrationRole.passenger,
        phone: '+33612345678',
        email: 'jane.doe@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        currentStep: PassengerRegistrationStep.NOTIFICATIONS,
      },
    });
  });

  it('should move to COMPLETE after the NOTIFICATIONS step', () => {
    // Arrange
    const fromStep = PassengerRegistrationStep.NOTIFICATIONS;

    // Act
    registration.advanceStep({ fromStep });

    // Assert
    expect(registration.currentStep).toBe(PassengerRegistrationStep.COMPLETE);
  });
});
