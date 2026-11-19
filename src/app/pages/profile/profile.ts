import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserProfile } from '../../models/userTypes';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';
import { UserService } from '../../services/user';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  pictureUrl: string;
  dateOfBirth: string;
}

@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly router = inject(Router);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly profileSaving = signal(false);
  readonly pictureLoading = signal(false);
  readonly profileMessage = signal('');
  readonly profileError = signal('');
  readonly passwordSaving = signal(false);
  readonly passwordMessage = signal('');
  readonly passwordError = signal('');

  private pictureReader: FileReader | null = null;

  profileForm: ProfileForm = this.emptyProfileForm();
  passwordForm = { currentPassword: '', newPassword: '' };

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.loadError.set('');

    this.userService.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.userService.setCurrentProfile(profile);
        this.profileForm = {
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: profile.email ?? '',
          phoneNumber: profile.details?.phoneNumber ?? '',
          address: profile.details?.address ?? '',
          pictureUrl: profile.details?.pictureUrl ?? '',
          dateOfBirth: this.toDateInput(profile.details?.dob),
        };
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.authService.logout();
          this.userService.setCurrentProfile(null);
          void this.router.navigateByUrl('/login');
          return;
        }

        this.loadError.set(this.getErrorMessage(error, 'Could not load your profile.'));
        this.loading.set(false);
      },
    });
  }

  saveProfile(form: NgForm): void {
    if (form.invalid || this.profileSaving() || this.pictureLoading()) {
      return;
    }

    const phoneNumber = this.normalizePhoneNumber(this.profileForm.phoneNumber);
    if (phoneNumber.length < 7 || phoneNumber.length > 15) {
      this.profileError.set('Enter a valid phone number with 7 to 15 digits.');
      this.profileMessage.set('');
      return;
    }

    this.profileSaving.set(true);
    this.profileMessage.set('');
    this.profileError.set('');

    this.userService
      .updateProfile({
        ...this.profileForm,
        phoneNumber,
        dateOfBirth: this.profileForm.dateOfBirth
          ? new Date(`${this.profileForm.dateOfBirth}T00:00:00.000Z`).toISOString()
          : null,
      })
      .subscribe({
        next: () => {
          const currentProfile = this.profile();
          if (currentProfile) {
            const updatedProfile: UserProfile = {
              ...currentProfile,
              firstName: this.profileForm.firstName,
              lastName: this.profileForm.lastName,
              email: this.profileForm.email,
              details: {
                phoneNumber,
                address: this.profileForm.address,
                pictureUrl: this.profileForm.pictureUrl,
                dob: this.profileForm.dateOfBirth
                  ? new Date(`${this.profileForm.dateOfBirth}T00:00:00.000Z`).toISOString()
                  : '',
              },
            };
            this.profile.set(updatedProfile);
            this.userService.setCurrentProfile(updatedProfile);
          }
          this.profileMessage.set('Your profile was updated.');
          this.profileSaving.set(false);
        },
        error: (error: unknown) => {
          this.profileError.set(this.getErrorMessage(error, 'Could not update your profile.'));
          this.profileSaving.set(false);
        },
      });
  }

  isPhoneNumberValid(value: string): boolean {
      const digitCount = this.normalizePhoneNumber(value).length;
      return digitCount >= 7 && digitCount <= 15;
  }

  onPictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.profileError.set('');
    this.profileMessage.set('');

    if (!file.type.startsWith('image/')) {
      this.profileError.set('Choose an image file for your profile picture.');
      input.value = '';
      return;
    }

    const previousReader = this.pictureReader;
    this.pictureReader = null;
    previousReader?.abort();

    const reader = new FileReader();
    this.pictureReader = reader;
    this.pictureLoading.set(true);
    reader.onload = () => {
      if (this.pictureReader !== reader) {
        return;
      }

      if (typeof reader.result !== 'string') {
        this.pictureReader = null;
        this.pictureLoading.set(false);
        this.profileError.set('Could not read that image. Please try another file.');
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (this.pictureReader !== reader) {
          return;
        }

        try {
          const maxDimension = 512;
          const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Could not process that image.');
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          this.profileForm = {
            ...this.profileForm,
            pictureUrl: canvas.toDataURL('image/webp', 0.8),
          };
          this.pictureReader = null;
          this.pictureLoading.set(false);
        } catch {
          this.pictureReader = null;
          this.pictureLoading.set(false);
          this.profileError.set('Could not process that image. Please try another file.');
        }
      };
      image.onerror = () => {
        if (this.pictureReader === reader) {
          this.pictureReader = null;
          this.pictureLoading.set(false);
          this.profileError.set('Could not process that image. Please try another file.');
        }
      };
      image.src = reader.result;
    };
    reader.onerror = () => {
      if (this.pictureReader === reader) {
        this.pictureReader = null;
        this.pictureLoading.set(false);
        this.profileError.set('Could not read that image. Please try another file.');
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  changePassword(form: NgForm): void {
    if (form.invalid || this.passwordSaving()) {
      return;
    }

    this.passwordSaving.set(true);
    this.passwordMessage.set('');
    this.passwordError.set('');

    this.userService.changePassword(this.passwordForm).subscribe({
      next: () => {
        this.passwordForm = { currentPassword: '', newPassword: '' };
        form.resetForm(this.passwordForm);
        this.passwordMessage.set('Your password was changed.');
        this.passwordSaving.set(false);
      },
      error: (error: unknown) => {
        this.passwordError.set(
          this.getErrorMessage(error, 'Could not change your password.'),
        );
        this.passwordSaving.set(false);
      },
    });
  }

  signOut(): void {
    this.cartService.clear();
    this.cartService.clearNotice();
    this.favoritesService.clear();
    this.authService.logout();
    this.userService.setCurrentProfile(null);
    void this.router.navigateByUrl('/');
  }

  private emptyProfileForm(): ProfileForm {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      address: '',
      pictureUrl: '',
      dateOfBirth: '',
    };
  }

  private toDateInput(value: string | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private normalizePhoneNumber(value: string): string {
    return value.replace(/\D/g, '');
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') {
        return detail;
      }

      const errors = error.error?.errors;
      if (errors && typeof errors === 'object') {
        const messages = Object.values(errors)
          .flatMap((value) => (Array.isArray(value) ? value : []))
          .filter((value): value is string => typeof value === 'string');
        if (messages.length > 0) {
          return messages.join(' ');
        }
      }
    }

    return error instanceof Error ? error.message : fallback;
  }
}
