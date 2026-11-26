import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnChanges,
  signal,
  SimpleChanges,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { StoreService } from '../../services/store';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/productTypes';
import { CartService } from '../../services/cart';
import { ProductCard } from '../../components/product-card/product-card';

@Component({
  selector: 'app-products',
  imports: [ProductCard],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnChanges {

  private route = inject(ActivatedRoute)
  storeService = inject(StoreService)
  private readonly cartService = inject(CartService)
  readonly categoryId = input<number | null>(null)
  readonly brand = input('')
  readonly minPrice = input('')
  readonly maxPrice = input('')
  readonly minRating = input(0)
  readonly inStockOnly = input(false)
  readonly sortBy = input<'newest' | 'priceAsc' | 'priceDesc'>('newest')
  readonly searchTerm = this.storeService.searchTerm
  private lastLoadedCategoryId: number | undefined
  private lastLoadedBrand: string | undefined
  private readonly pageSize = 3
  
  loading = signal<boolean>(true)
  error = signal<string>('')
  categoryName = signal('Products')
  categoryError = signal('')
  products = signal<Product[]>([])
  private readonly searchProducts = signal<Product[] | null>(null)
  private searchProductsLoading = false
  currentPage = signal(1)

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim()
    const products = term ? this.searchProducts() ?? [] : this.products()
    const minPrice = this.minPrice().trim() ? Number(this.minPrice()) : null
    const maxPrice = this.maxPrice().trim() ? Number(this.maxPrice()) : null
    const minRating = this.minRating()
    const inStockOnly = this.inStockOnly()
    const sortBy = this.sortBy()

    return products
      .filter((product) => {
        if (!product.name.toLowerCase().includes(term)) {
          return false
        }
        if (minPrice !== null && Number.isFinite(minPrice) && product.price < minPrice) {
          return false
        }
        if (maxPrice !== null && Number.isFinite(maxPrice) && product.price > maxPrice) {
          return false
        }
        if (product.rating < minRating || (inStockOnly && product.stock <= 0)) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') {
          return a.price - b.price
        }
        if (sortBy === 'priceDesc') {
          return b.price - a.price
        }
        const dateDifference =
          Date.parse(b.createdAt) - Date.parse(a.createdAt)
        return Number.isNaN(dateDifference) || dateDifference === 0
          ? b.id - a.id
          : dateDifference
      })
  })
  
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize)),
  )
  visibleProducts = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages())
    const start = (page - 1) * this.pageSize
    return this.filteredProducts().slice(start, start + this.pageSize)
  })
  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  )

  constructor() {
    effect(() => {
      this.currentPage.set(1)

      if (this.searchTerm().trim()) {
        this.loadSearchProducts()
        return
      }

      this.error.set('')
      const brand = this.brand().trim()
      if (brand) {
        this.loadBrand(brand)
        return
      }

      const categoryId = this.categoryId() ?? this.getRouteCategoryId()
      if (categoryId !== null) {
        this.loadCategory(categoryId)
      }
    })
  }

  addToCart(product: Product): void {
    this.cartService.add(product);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['minPrice'] ||
      changes['maxPrice'] ||
      changes['minRating'] ||
      changes['inStockOnly'] ||
      changes['sortBy'] ||
      changes['brand']
    ) {
      this.currentPage.set(1);
    }

  }

  private getRouteCategoryId(): number | null {
    const categoryId =
      this.route.snapshot.queryParamMap.get('category') ??
      this.route.snapshot.paramMap.get('id');
    return categoryId === null ? null : Number(categoryId);
  }

  private loadCategory(id: number): void {
    this.lastLoadedBrand = undefined;
    if (Object.is(this.lastLoadedCategoryId, id)) {
      return;
    }
    this.lastLoadedCategoryId = id;
    this.currentPage.set(1);

    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('A valid category is required to load products.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.categoryName.set('Products');
    this.categoryError.set('');

    this.storeService.getCategories().subscribe({
      next: (res) => {
        const category = res.data.find((item) => item.id === id);
        if (category) {
          this.categoryName.set(category.name);
        } else {
          this.categoryError.set('Category name could not be found.');
        }
      },
      error: (err) => {
        this.categoryError.set('Could not load category name: ' + err.message);
      },
    });

    this.loadProducts(id);
  }

  private loadBrand(brand: string): void {
    if (this.lastLoadedBrand === brand) {
      return;
    }

    this.lastLoadedBrand = brand;
    this.lastLoadedCategoryId = undefined;
    this.currentPage.set(1);
    this.loading.set(true);
    this.error.set('');
    this.categoryName.set(brand);
    this.categoryError.set('');

    this.storeService.getCategories().subscribe({
      next: ({ data: categories }) => {
        if (categories.length === 0) {
          this.products.set([]);
          this.loading.set(false);
          return;
        }
        
        forkJoin(
          categories.map((category) =>
            this.storeService.getAllProductsByCategory(category.id),
          ),

        ).subscribe({
          next: (productsByCategory) => {
            this.products.set(
              productsByCategory.flat().filter(
                (product) =>
                  product.brand?.trim().toLocaleLowerCase() ===
                  brand.toLocaleLowerCase(),
              ),
            );
            this.loading.set(false);
          },
          error: (err: Error) => {
            this.error.set('Error fetching brand products: ' + err.message);
            this.loading.set(false);
          },
        });
      },
      error: (err: Error) => {
        this.error.set('Error fetching categories for brand: ' + err.message);
        this.loading.set(false);
      },
    });
  }

  goToPage(page: number): void {
    if (
      page < 1 ||
      page > this.totalPages() ||
      page === this.currentPage()
    ) {
      return;
    }

    this.currentPage.set(page);
  }

  private loadProducts(categoryId: number): void {
    this.loading.set(true);
    this.error.set('');

    this.storeService.getAllProductsByCategory(categoryId).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error fetching products: ' + err.message);
        this.loading.set(false);
      },
    });
  }

  private loadSearchProducts(): void {
    this.categoryName.set('Search results')
    this.error.set('')
    if (this.searchProducts()) {
      this.loading.set(false)
      return
    }
    if (this.searchProductsLoading) {
      return
    }

    this.searchProductsLoading = true
    this.loading.set(true)
    this.storeService.getCategories().subscribe({
      next: ({ data: categories }) => {
        if (categories.length === 0) {
          this.searchProducts.set([])
          this.searchProductsLoading = false
          this.loading.set(false)
          return
        }

        forkJoin(
          categories.map((category) =>
            this.storeService.getAllProductsByCategory(category.id),
          ),
        ).subscribe({
          next: (productsByCategory) => {
            this.searchProducts.set(productsByCategory.flat())
            this.searchProductsLoading = false
            this.loading.set(false)
          },
          error: (error: Error) => {
            this.error.set('Could not search products: ' + error.message)
            this.searchProductsLoading = false
            this.loading.set(false)
          },
        })
      },
      error: (error: Error) => {
        this.error.set('Could not load categories for search: ' + error.message)
        this.searchProductsLoading = false
        this.loading.set(false)
      },
    })
  }
}
