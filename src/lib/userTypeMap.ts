// Mapping between the frontend's informal user type ("buyer" | "lister" | "agent" | "admin")
// and the backend's UserType + CustomerType + ListerType enum trio.
//
// Decision (confirmed by user): buyer → Customer/Buyer, lister → Lister/Individual,
// agent → Lister/Agent.

import {
  CustomerTypeEnum,
  ListerTypeEnum,
  UserTypeEnum,
  type ApiCustomerType,
  type ApiListerType,
  type ApiUserType,
  type ProfileResponse,
  type RegisterPayload,
} from "./api";

export type UiUserType = "buyer" | "lister" | "agent" | "admin";

export function toApiTypes(ui: UiUserType): Pick<
  RegisterPayload,
  "userType" | "customerType" | "listerType"
> {
  switch (ui) {
    case "buyer":
      return {
        userType: UserTypeEnum.Customer,
        customerType: CustomerTypeEnum.Buyer,
        listerType: null,
      };
    case "lister":
      return {
        userType: UserTypeEnum.Lister,
        listerType: ListerTypeEnum.Individual,
        customerType: null,
      };
    case "agent":
      return {
        userType: UserTypeEnum.Lister,
        listerType: ListerTypeEnum.Agent,
        customerType: null,
      };
    case "admin":
      return { userType: UserTypeEnum.Admin, customerType: null, listerType: null };
  }
}

export function fromApiTypes(
  userType: ApiUserType,
  listerType?: ApiListerType | null,
  _customerType?: ApiCustomerType | null
): UiUserType {
  if (userType === UserTypeEnum.Admin) return "admin";
  if (userType === UserTypeEnum.Customer) return "buyer";
  if (userType === UserTypeEnum.Lister) {
    return listerType === ListerTypeEnum.Agent ? "agent" : "lister";
  }
  return "buyer";
}

export function uiUserFromProfile(p: ProfileResponse) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    phoneNumber: p.phoneNumber,
    agencyName: p.agencyName,
    licenseNumber: p.licenseNumber,
    profilePictureUrl: p.profilePictureUrl,
    userType: p.userType,
    customerType: p.customerType,
    listerType: p.listerType,
    user_type: fromApiTypes(p.userType, p.listerType, p.customerType),
  };
}

export type StoredUser = ReturnType<typeof uiUserFromProfile>;
