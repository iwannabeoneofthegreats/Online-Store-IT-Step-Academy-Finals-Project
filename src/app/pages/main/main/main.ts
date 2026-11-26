import { ChangeDetectionStrategy, Component, inject, OnInit, signal,} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Categories } from '../../categories/categories/categories';
import { BrandFeature, Product } from '../../../models/productTypes';
import { CartService } from '../../../services/cart';
import { StoreService } from '../../../services/store';
import { ProductCard } from '../../../components/product-card/product-card';
import { ShopBenefits } from '../../../components/shop-benefits/shop-benefits';

@Component({
  selector: 'app-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Categories, ProductCard, RouterLink, ShopBenefits],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit {
  private readonly storeService = inject(StoreService);
  private readonly cartService = inject(CartService);

  readonly featuredProducts = signal<Product[]>([]);
  readonly brands = signal<BrandFeature[]>([]);
  readonly featuredLoading = signal(true);
  readonly featuredError = signal('');

  ngOnInit(): void {
    this.storeService.getCategories().subscribe({
      next: ({ data: categories }) => {
        if (categories.length === 0) {
          this.featuredError.set('No products are available right now.');
          this.featuredLoading.set(false);
          return;
        }

        forkJoin(
          categories.map((category) =>
            this.storeService.getProductsByCategory(category.id),
          ),
        ).subscribe({
          next: (responses) => {
            const products = responses.flatMap(
              (response) => response.data.items ?? [],
            );
            const brandNames = new Set<string>();
            for (const product of products) {
              const brand = product.brand?.trim();
              if (brand) {
                brandNames.add(brand);
              }
            }
            this.brands.set(
              [...brandNames]
                .map((name) => ({
                  name,
                  logoUrl: `https://cdn.simpleicons.org/${this.getBrandSlug(name)}`,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            );
            const newestProducts = [...products].sort((a, b) => {
              const aCreatedAt = Date.parse(a.createdAt);
              const bCreatedAt = Date.parse(b.createdAt);
              const aHasValidDate = Number.isFinite(aCreatedAt);
              const bHasValidDate = Number.isFinite(bCreatedAt);

              if (aHasValidDate && bHasValidDate && aCreatedAt !== bCreatedAt) {
                return bCreatedAt - aCreatedAt;
              }
              if (aHasValidDate !== bHasValidDate) {
                return aHasValidDate ? -1 : 1;
              }
              return b.id - a.id;
            });
            this.featuredProducts.set(newestProducts.slice(0, 4));
            this.featuredLoading.set(false);
          },
          error: (error: Error) => {
            this.featuredError.set(
              'Could not load featured products: ' + error.message,
            );
            this.featuredLoading.set(false);
          },
        });
      },
      error: (error: Error) => {
        this.featuredError.set(
          'Could not load featured products: ' + error.message,
        );
        this.featuredLoading.set(false);
      },
    });
  }

  addToCart(product: Product): void {
    this.cartService.add(product);
  }

  private getBrandSlug(brand: string): string {
    const knownSlugs: Record<string, string> = {
      'tp-link': 'tplink',
      'western digital': 'westerndigital',
      'hewlett-packard': 'hp',
    };
    const normalized = brand.trim().toLocaleLowerCase();
    return knownSlugs[normalized] ?? normalized.replace(/[^a-z0-9]/g, '');
  }
}
