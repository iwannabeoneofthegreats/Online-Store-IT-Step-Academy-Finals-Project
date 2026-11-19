export interface UserProfile {
  id: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  details: {
    phoneNumber: string;
    address: string;
    dob: string;
    pictureUrl: string;
  };
}

export interface UserProfileResponse {
  data: UserProfile;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  pictureUrl: string;
  dateOfBirth: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
