import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  data: {
    accessToken: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly accessToken = signal(
    this.isBrowser ? localStorage.getItem('accessToken') : null,
  );
  private readonly apiUrl = 'https://shopapi.stepacademy.ge/api';

  readonly isAuthenticated = computed(() => this.accessToken() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/auth/login`,
        { email, password },
      )
      .pipe(
        tap((response) => {
          if (!response.data.accessToken) {
            throw new Error('The login response did not contain an access token.');
          }

          if (this.isBrowser) {
            localStorage.setItem('accessToken', response.data.accessToken);
          }
          this.accessToken.set(response.data.accessToken);
        }),
      );
  }

  register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Observable<unknown> {
    return this.http.post(
      `${this.apiUrl}/auth/register`,
      { firstName, lastName, email, password },
    );
  }

  verifyEmail(email: string, code: string): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/auth/verify-email`,
      { email, code },
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('accessToken');
    }
    this.accessToken.set(null);
  }
}
