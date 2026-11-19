import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../models/productTypes';
import { AuthService } from './auth';
import { CartService } from './cart';
import { StoreService } from './store';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly storeService = inject(StoreService);
  private loaded = false;
  private requestVersion = 0;

  readonly favorites = signal<Product[]>([]);
  readonly favoriteIds = signal<ReadonlySet<number>>(new Set());
  readonly loading = signal(false);
  readonly error = signal('');
  readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  loadFavorites(): void {
    if (!this.authService.isAuthenticated()) {
      this.clear();
      return;
    }

    if (this.loaded || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const requestVersion = this.requestVersion;
    this.storeService.getAllFavorites().subscribe({
      next: (products) => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.favorites.set(products);
        this.favoriteIds.set(new Set(products.map((product) => product.id)));
        this.loaded = true;
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.error.set(this.getErrorMessage(error, 'Could not load favorites.'));
        this.loading.set(false);
      },
    });
  }

  toggle(product: Product): void {
    if (!this.authService.isAuthenticated()) {
      this.cartService.requireLogin(
        'Please sign in or register before adding items to your favorites.',
      );
      void this.router.navigateByUrl('/login');
      return;
    }

    const productId = product.id;
    if (this.pendingIds().has(productId)) {
      return;
    }

    const removing = this.favoriteIds().has(productId);
    this.pendingIds.update((ids) => new Set(ids).add(productId));
    this.error.set('');
    const requestVersion = this.requestVersion;
    const request = removing
      ? this.storeService.removeFavorite(productId)
      : this.storeService.addFavorite(productId);

    request.subscribe({
      next: () => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.favoriteIds.update((ids) => {
          const updatedIds = new Set(ids);
          if (removing) {
            updatedIds.delete(productId);
          } else {
            updatedIds.add(productId);
          }
          return updatedIds;
        });
        this.favorites.update((products) =>
          removing
            ? products.filter((item) => item.id !== productId)
            : [...products, product],
        );
        this.pendingIds.update((ids) => {
          const updatedIds = new Set(ids);
          updatedIds.delete(productId);
          return updatedIds;
        });
      },
      error: (error: unknown) => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.cartService.showErrorNotice(
          this.getErrorMessage(error, 'Could not update favorites.'),
        );
        this.pendingIds.update((ids) => {
          const updatedIds = new Set(ids);
          updatedIds.delete(productId);
          return updatedIds;
        });
      },
    });
  }

  clear(): void {
    this.requestVersion += 1;
    this.loaded = false;
    this.favorites.set([]);
    this.favoriteIds.set(new Set());
    this.error.set('');
    this.loading.set(false);
    this.pendingIds.set(new Set());
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') {
        return detail;
      }
    }

    return error instanceof Error ? error.message : fallback;
  }
}
