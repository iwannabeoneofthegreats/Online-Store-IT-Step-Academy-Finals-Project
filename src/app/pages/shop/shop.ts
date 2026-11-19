import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Category } from '../../models/productTypes';
import { StoreService } from '../../services/store';
import { Products } from '../products/products';
import { ShopBenefits } from '../../components/shop-benefits/shop-benefits';

@Component({
  selector: 'app-shop',
  imports: [Products, RouterLink, ShopBenefits],
  templateUrl: './shop.html',
  styleUrl: './shop.css',
})
export class Shop implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly storeService = inject(StoreService);

  readonly categories = signal<Category[]>([]);
  readonly brands = signal<string[]>([]);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedBrand = signal('');
  readonly loadingCategories = signal(true);
  readonly categoriesError = signal('');
  readonly minPrice = signal('');
  readonly maxPrice = signal('');
  readonly minRating = signal(0);
  readonly inStockOnly = signal(false);
  readonly sortBy = signal<'newest' | 'priceAsc' | 'priceDesc'>('newest');

  updateMinPrice(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.minPrice.set(event.target.value);
    }
  }

  updateMaxPrice(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.maxPrice.set(event.target.value);
    }
  }

  updateMinRating(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.minRating.set(Number(event.target.value));
    }
  }

  updateBrand(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.selectedBrand.set(event.target.value);
    }
  }

  updateInStockOnly(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.inStockOnly.set(event.target.checked);
    }
  }

  updateSortBy(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      const sortBy = event.target.value;
      if (sortBy === 'newest' || sortBy === 'priceAsc' || sortBy === 'priceDesc') {
        this.sortBy.set(sortBy);
      }
    }
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const brand = params.get('brand')?.trim() ?? '';
      this.selectedBrand.set(brand);

      const categoryId = params.get('category');
      if (categoryId !== null) {
        this.selectedCategoryId.set(Number(categoryId));
        return;
      }

      if (brand) {
        this.selectedCategoryId.set(this.categories()[0]?.id ?? null);
        return;
      }

      const firstCategory = this.categories()[0];
      if (!this.loadingCategories() && firstCategory) {
        this.selectedCategoryId.set(firstCategory.id);
      }
    });

    this.storeService.getCategories().subscribe({

      next: ({ data: categories }) => {
        this.categories.set(categories);
        this.loadingCategories.set(false);

        if (categories.length > 0) {
          forkJoin(
            categories.map((category) =>
              this.storeService.getAllProductsByCategory(category.id),
            ),
          ).subscribe({
            next: (productsByCategory) => {
              this.brands.set(
                [
                  ...new Set(
                    productsByCategory
                      .flat()
                      .map((product) => product.brand?.trim())
                      .filter((brand): brand is string => Boolean(brand)),
                  ),
                ].sort((a, b) => a.localeCompare(b)),
              );
            },
            error: (error: Error) => {
              this.categoriesError.set(
                'Could not load product brands: ' + error.message,
              );
            },
          });
        }

        if (this.route.snapshot.queryParamMap.has('brand')) {
          this.selectedCategoryId.set(categories[0]?.id ?? null);
          return;
        }

        if (this.route.snapshot.queryParamMap.has('category')) {
          return;
        }

        const firstCategory = categories[0];
        if (firstCategory) {
          this.selectedCategoryId.set(firstCategory.id);
        } else {
          this.categoriesError.set('No categories are available right now.');
        }
      },
      error: (error: Error) => {
        this.categoriesError.set('Could not load categories: ' + error.message);
        this.loadingCategories.set(false);
      },
    });
  }

}
