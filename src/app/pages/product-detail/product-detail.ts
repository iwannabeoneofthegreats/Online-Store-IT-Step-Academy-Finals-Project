import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, EMPTY } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductRating } from '../../components/product-rating/product-rating';
import { ShopBenefits } from '../../components/shop-benefits/shop-benefits';
import { Product, Review } from '../../models/productTypes';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart';
import { StoreService } from '../../services/store';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, DatePipe, ProductCard, ProductRating, RouterLink, ShopBenefits],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  readonly authService = inject(AuthService);
  private readonly storeService = inject(StoreService);
  private readonly cartService = inject(CartService);
  private readonly userService = inject(UserService);

  readonly product = signal<Product | null>(null);
  readonly relatedProducts = signal<Product[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly currentUserId = signal<number | null>(null);
  readonly reviewsLoading = signal(false);
  readonly reviewsError = signal('');
  readonly reviewsPage = signal(1);
  readonly reviewsHaveMore = signal(false);
  readonly reviewRating = signal(5);
  readonly reviewSubmitting = signal(false);
  readonly reviewSubmitError = signal('');
  readonly reviewDeleting = signal(false);
  readonly reviewDeleteError = signal('');
  readonly loading = signal(true);
  readonly error = signal('');

  private reviewsRequestVersion = 0;
  private reviewSubmitVersion = 0;
  private reviewDeleteVersion = 0;

  addToCart(product: Product): void {
    this.cartService.add(product);
  }

  reviewerName(review: Review): string {
    const name = [review.user.firstName, review.user.lastName]
      .filter((part): part is string => Boolean(part))
      .join(' ');
    return name || review.user.email || 'Customer';
  }

  updateReviewRating(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      const rating = Number(event.target.value);
      if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
        this.reviewRating.set(rating);
      }
    }
  }

  submitReview(event: Event): void {
    event.preventDefault();
    const product = this.product();
    if (!product || !this.authService.isAuthenticated()) {
      this.reviewSubmitError.set('Please sign in to leave a rating.');
      return;
    }

    const requestVersion = ++this.reviewSubmitVersion;
    this.reviewSubmitting.set(true);
    this.reviewSubmitError.set('');
    this.storeService
      .addReview({ productId: product.id, rate: this.reviewRating() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (requestVersion !== this.reviewSubmitVersion) {
            return;
          }
          this.reviewSubmitting.set(false);
          if (this.product()?.id === product.id) {
            this.loadReviews(product.id);
          }
        },
        error: (error: unknown) => {
          if (requestVersion !== this.reviewSubmitVersion) {
            return;
          }
          this.reviewSubmitting.set(false);
          this.reviewSubmitError.set(
            'Could not submit your rating: ' +
              this.getReviewErrorMessage(error),
          );
        },
      });
  }

  deleteReview(review: Review): void {
    const product = this.product();
    if (
      !product ||
      !this.authService.isAuthenticated() ||
      review.user.id !== this.currentUserId() ||
      this.reviewDeleting()
    ) {
      return;
    }

    const requestVersion = ++this.reviewDeleteVersion;
    this.reviewDeleting.set(true);
    this.reviewDeleteError.set('');
    this.storeService
      .deleteReview(review.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (requestVersion !== this.reviewDeleteVersion) {
            return;
          }
          this.reviewDeleting.set(false);
          if (this.product()?.id === product.id) {
            this.loadReviews(product.id);
          }
        },
        error: (error: unknown) => {
          if (requestVersion !== this.reviewDeleteVersion) {
            return;
          }
          this.reviewDeleting.set(false);
          this.reviewDeleteError.set(
            'Could not delete your rating: ' +
              this.getReviewErrorMessage(error),
          );
        },
      });
  }

  retryReviews(): void {
    const product = this.product();
    if (product && !this.reviewsLoading()) {
      this.loadReviews(product.id);
    }
  }

  loadMoreReviews(): void {
    const product = this.product();
    if (!product || this.reviewsLoading() || !this.reviewsHaveMore()) {
      return;
    }
    this.loadReviews(product.id, this.reviewsPage() + 1, true);
  }

  ngOnInit(): void {
    this.loadCurrentUserId();
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(
      switchMap(([params, queryParams]) => {
        const productId = Number(params.get('id'));
        const categoryId = Number(queryParams.get('category'));

        this.product.set(null);
        this.relatedProducts.set([]);
        this.error.set('');
        this.resetReviews();

        if (!Number.isInteger(productId) || productId <= 0 ||
          !Number.isInteger(categoryId) || categoryId <= 0) {
          this.error.set('A valid product could not be identified.');
          this.loading.set(false);
          return EMPTY;
        }

        this.loading.set(true);
        return this.storeService.getAllProductsByCategory(categoryId).pipe(
          map((products) => ({ productId, products })),
          catchError((error: Error) => {
            this.error.set('Could not load product details: ' + error.message);
            this.loading.set(false);
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ productId, products }) => {
      const product = products.find((item) => item.id === productId);
      if (!product) {
        this.error.set('This product could not be found.');
      } else {
        this.product.set(product);
        this.relatedProducts.set(
          products
            .filter((item) => item.id !== product.id)
            .slice(0, 4),
        );
        this.loadReviews(product.id);
      }
      this.loading.set(false);
    });
  }

  private loadCurrentUserId(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    const cachedProfile = this.userService.currentProfile();
    if (cachedProfile) {
      this.currentUserId.set(cachedProfile.id);
      return;
    }

    this.userService
      .getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.userService.setCurrentProfile(profile);
          this.currentUserId.set(profile.id);
        },
        error: (error: Error) => {
          this.reviewDeleteError.set(
            'Could not verify your account for review deletion: ' +
              error.message,
          );
        },
      });
  }

  private loadReviews(
    productId: number,
    page = 1,
    append = false,
  ): void {
    const requestVersion = ++this.reviewsRequestVersion;
    this.reviewsLoading.set(true);
    this.reviewsError.set('');

    this.storeService
      .getReviews(productId, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestVersion !== this.reviewsRequestVersion) {
            return;
          }
          const pageData = 'data' in response ? response.data : response;
          const items = pageData.items ?? [];
          this.reviews.update((current) =>
            append ? [...current, ...items] : items,
          );
          this.reviewsPage.set(pageData.currentPage);
          this.reviewsHaveMore.set(pageData.hasMore);
          this.reviewsLoading.set(false);
        },
        error: (error: unknown) => {
          if (requestVersion !== this.reviewsRequestVersion) {
            return;
          }
          this.reviewsError.set(
            'Could not load reviews: ' + this.getReviewErrorMessage(error),
          );
          this.reviewsLoading.set(false);
        },
      });
  }

  private getReviewErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error?.detail;
      if (typeof detail === 'string') {
        return detail;
      }

      if (error.status === 404) {
        return 'The API returned 404. Check that the signed-in account has a rating for this product and that the server uses productId for deletion.';
      }
    }

    return error instanceof Error ? error.message : 'An unexpected error occurred.';
  }

  private resetReviews(): void {
    this.reviewsRequestVersion += 1;
    this.reviewSubmitVersion += 1;
    this.reviews.set([]);
    this.reviewsLoading.set(false);
    this.reviewsError.set('');
    this.reviewsPage.set(1);
    this.reviewsHaveMore.set(false);
    this.reviewSubmitting.set(false);
    this.reviewSubmitError.set('');
    this.reviewDeleteVersion += 1;
    this.reviewDeleting.set(false);
    this.reviewDeleteError.set('');
  }
}
