import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Category } from '../../models/productTypes';
import { StoreService } from '../../services/store';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  private readonly storeService = inject(StoreService);
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  readonly searchTerm = this.storeService.searchTerm;
  readonly currentProfile = this.userService.currentProfile;

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly profileImageFailed = signal(false);
  readonly profileLoading = signal(false);
  readonly profileError = signal('');
  readonly menuOpen = signal(false);
  readonly categoriesOpen = signal(false);

  get profileInitials(): string {
    const profile = this.userService.currentProfile();
    const firstInitial = profile?.firstName?.trim().charAt(0) ?? '';
    const lastInitial = profile?.lastName?.trim().charAt(0) ?? '';
    return `${firstInitial}${lastInitial}`.toLocaleUpperCase();
  }

  constructor() {
    effect(() => {
      if (this.searchTerm().trim() && !this.router.url.startsWith('/shops')) {
        void this.router.navigateByUrl('/shops');
      }
    });

    effect(() => {
      this.userService.currentProfile()?.details?.pictureUrl;
      this.profileImageFailed.set(false);
    });

    effect((onCleanup) => {
      if (!this.authService.isAuthenticated()) {
        this.userService.setCurrentProfile(null);
        this.favoritesService.clear();
        this.profileImageFailed.set(false);
        this.profileLoading.set(false);
        this.profileError.set('');
        return;
      }

      this.profileLoading.set(true);
      this.profileError.set('');
      const subscription = this.userService.getMe().subscribe({
        next: (profile) => {
          this.userService.setCurrentProfile(profile);
          this.profileImageFailed.set(false);
          this.profileLoading.set(false);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.authService.logout();
            this.userService.setCurrentProfile(null);
            return;
          }

          const message = error instanceof Error ? error.message : 'Unknown error.';
          this.profileError.set('Could not load profile details: ' + message);
          this.profileLoading.set(false);
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  ngOnInit(): void {
    this.storeService.getCategories().subscribe({
      next: (response) => {
        this.categories.set(response.data);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.error.set('Could not load categories: ' + error.message);
        this.loading.set(false);
      },
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.categoriesOpen.set(false);
  }

  toggleCategories(): void {
    this.categoriesOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.categoriesOpen.set(false);
  }
}
