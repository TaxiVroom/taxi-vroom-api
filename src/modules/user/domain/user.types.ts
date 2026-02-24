// import { Address } from './value-objects/address.value-object';

// All properties that a User has
export interface UserProps {
  role: UserRoles;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  // address: Address;
}

// Properties that are needed for a user creation
export interface CreateUserProps {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRoles;
  // address: Address;
}

// Properties used for updating a user address
// export interface UpdateUserAddressProps {
//   country?: string;
//   postalCode?: string;
//   street?: string;
// }

export enum UserRoles {
  passenger = 'PASSENGER',
  driver = 'DRIVER',
  // admin = 'admin',
  // moderator = 'moderator',
  // guest = 'guest',
}
