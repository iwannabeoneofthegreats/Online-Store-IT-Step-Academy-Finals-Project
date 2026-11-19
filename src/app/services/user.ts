import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserProfile,
  UserProfileResponse,
} from '../models/userTypes';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://shopapi.stepacademy.ge/api/users';

  readonly currentProfile = signal<UserProfile | null>(null);

  setCurrentProfile(profile: UserProfile | null): void {
    this.currentProfile.set(profile);
  }

  getMe(): Observable<UserProfile> {
    return this.http
      .get<UserProfile | UserProfileResponse>(`${this.apiUrl}/me`)
      .pipe(
        map((response) => {
          const profile = 'firstName' in response ? response : response.data;
          if (
            typeof profile.firstName !== 'string' ||
            typeof profile.lastName !== 'string' ||
            !profile.details
          ) {
            throw new Error('The profile response did not contain user details.');
          }
          return profile;
        }),
      );
  }

  updateProfile(body: UpdateProfileRequest): Observable<unknown> {
    return this.http.put(`${this.apiUrl}`, body);
  }

  changePassword(body: ChangePasswordRequest): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/change-password`, body);
  }
}
