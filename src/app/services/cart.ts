import {
  afterNextRender,
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Product } from '../models/productTypes';
import { AuthService } from './auth';
import { StoreService } from './store';

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly authService = inject(AuthService);
  private readonly storeService = inject(StoreService);
  private readonly router = inject(Router);
  private cartRequestVersion = 0;

  readonly items = signal<CartItem[]>([]);
  readonly itemCount = computed(() =>
    this.items().reduce((count, item) => count + item.quantity, 0),
  );
  readonly total = computed(() =>
    this.items().reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    ),
  );
  readonly notice = signal('');
  readonly noticeKind = signal<'login' | 'success' | 'error' | null>(null);
  readonly noticeExiting = signal(false);
  private noticeTimeout: ReturnType<typeof setTimeout> | null = null;
  private noticeExitTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => this.load());
  }

  load(): void {
    this.refreshCart();
  }

  add(product: Product): boolean {
    if (!this.authService.isAuthenticated()) {
      this.requireLogin();
      void this.router.navigateByUrl('/login');
      return false;
    }

    this.mutateCart(
      this.storeService.addToCart({ productId: product.id, quantity: 1 }),
      `Could not add ${product.name} to your cart.`,
      `${product.name} added to your cart.`,
    );
    return true;
  }

  increase(productId: number): void {
    const item = this.items().find((cartItem) => cartItem.product.id === productId);
    if (item) {
      this.updateQuantity(item, item.quantity + 1);
    }
  }

  decrease(productId: number): void {
    const item = this.items().find((cartItem) => cartItem.product.id === productId);
    if (item && item.quantity > 1) {
      this.updateQuantity(item, item.quantity - 1);
    }
  }

  remove(itemId: number): void {
    this.mutateCart(
      this.storeService.removeFromCart(itemId),
      'Could not remove this product from your cart.',
    );
  }

  clear(): void {
    this.cartRequestVersion++;
    this.items.set([]);
  }

  requireLogin(
    message = 'Please sign in or register before adding items to your cart.',
  ): void {
    this.clearNotice();
    this.notice.set(message);
    this.noticeKind.set('login');
    this.noticeTimeout = setTimeout(() => this.dismissNotice(), 5000);
  }

  showErrorNotice(message: string): void {
    this.clearNotice();
    this.notice.set(message);
    this.noticeKind.set('error');
    this.noticeTimeout = setTimeout(() => this.dismissNotice(), 5000);
  }

  dismissNotice(): void {
    if (!this.notice()) {
      return;
    }

    if (this.noticeTimeout !== null) {
      clearTimeout(this.noticeTimeout);
      this.noticeTimeout = null;
    }

    this.noticeExiting.set(true);
    this.noticeExitTimeout = setTimeout(() => this.clearNotice(), 300);
  }

  private showSuccessNotice(message: string): void {
    this.clearNotice();
    this.notice.set(message);
    this.noticeKind.set('success');
    this.noticeTimeout = setTimeout(() => this.dismissNotice(), 3500);
  }

  private updateQuantity(item: CartItem, quantity: number): void {
    this.mutateCart(
      this.storeService.editQuantity({ itemId: item.id, quantity }),
      'Could not update the quantity in your cart.',
    );
  }

  private mutateCart(
    request: Observable<unknown>,
    errorMessage: string,
    successMessage?: string,
  ): void {
    request.subscribe({
      next: () => this.refreshCart(successMessage),
      error: () => this.showErrorNotice(errorMessage),
    });
  }

  private refreshCart(successMessage?: string): void {
    if (!this.authService.isAuthenticated()) {
      this.items.set([]);
      return;
    }

    const requestVersion = ++this.cartRequestVersion;
    this.storeService.getCart().subscribe({
      next: (response) => {
        if (requestVersion !== this.cartRequestVersion) {
          return;
        }
        this.items.set(
          (response.data.items ?? []).map(({ id, product, quantity }) => ({
            id,
            product,
            quantity,
          })),
        );
        if (successMessage) {
          this.showSuccessNotice(successMessage);
        }
      },
      error: () => {
        if (requestVersion !== this.cartRequestVersion) {
          return;
        }
        this.showErrorNotice(
          successMessage
            ? 'Your cart changed, but could not be refreshed from the server.'
            : 'Could not load your cart from the server.',
        );
      },
    });
  }

  clearNotice(): void {
    if (this.noticeTimeout !== null) {
      clearTimeout(this.noticeTimeout);
      this.noticeTimeout = null;
    }
    if (this.noticeExitTimeout !== null) {
      clearTimeout(this.noticeExitTimeout);
      this.noticeExitTimeout = null;
    }
    this.notice.set('');
    this.noticeKind.set(null);
    this.noticeExiting.set(false);
  }


  checkoutCompleted(message: string): void {
    this.clear();
    this.showSuccessNotice(message)
  }


  checkout() {
    
    this.storeService.checkout().subscribe({
      next: (res) => {
        this.checkoutCompleted(res.message)
      },

      error: (err) => {
        this.showErrorNotice(
          err.error?.message || 'Checkout Failed'
        )
      }

    })
  }
}
