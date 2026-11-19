import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  input,
  OnDestroy,
  OnInit,
  OnChanges,
  PLATFORM_ID,
  signal,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandFeature, Category } from '../../../models/productTypes';
import { StoreService } from '../../../services/store';
import { shuffle } from '../../../utils/shuffle';

interface HeroSlide {
  imageUrl: string;
  imageAlt: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-categories',
  imports: [RouterLink],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories implements OnInit, OnDestroy, OnChanges {
  private storeService = inject(StoreService);
  private platformId = inject(PLATFORM_ID);
  private slideshowTimer: ReturnType<typeof setInterval> | undefined;
  private brandTimer: ReturnType<typeof setInterval> | undefined;
  private isHovered = false;
  private hasFocus = false;
  private isBrandsHovered = false;
  private hasBrandsFocus = false;

  readonly limit = input<number>();
  readonly brandSlides = input<BrandFeature[]>([]);
  loading = signal(true);
  error = signal('');
  categories = signal<Category[]>([]);
  activeSlide = signal(0);
  firstVisibleBrand = signal(0);
  isMobile = signal(false);
  brandDirection = signal<'next' | 'previous'>('next');
  failedBrandLogos = signal<ReadonlySet<string>>(new Set());
  showBrandControls = computed(
    () => this.brandSlides().length > (this.isMobile() ? 4 : 5),
  );
  visibleBrands = computed(() => {
    const brands = this.brandSlides();
    const count = Math.min(this.isMobile() ? 4 : 5, brands.length);
    return Array.from(
      { length: count },
      (_, index) => brands[(this.firstVisibleBrand() + index) % brands.length],
    );
  });

  readonly slides: HeroSlide[] = [
    {
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2000&q=85',
      imageAlt: 'Close-up of a detailed electronic circuit board',
      title: 'Technology for the way you live',
      description: 'Find the essentials that make every day a little smarter.',
    },
    {
      imageUrl:
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=2000&q=85',
      imageAlt: 'Laptop and workspace ready for a day of work',
      title: 'Make room for great ideas',
      description: 'Discover the tools to help you create, work, and play.',
    },
    {
      imageUrl:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2000&q=85',
      imageAlt: 'People collaborating around a laptop',
      title: 'Bring your setup together',
      description: 'Explore thoughtful tech for staying connected and inspired.',
    },
  ];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.onWindowResize();
    }

    if (
      isPlatformBrowser(this.platformId) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.startSlideshow();
    }

    this.storeService.getCategories().subscribe({
      next: (response) => {
        let categories = response.data;
        const limit = this.limit();

        if (limit !== undefined) {
          categories = shuffle(categories).slice(0, limit);
        }

        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set('Error fetching categories: ' + err.message);
        this.loading.set(false);
      },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['brandSlides']) {
      this.firstVisibleBrand.set(0);
      this.stopBrandSlideshow();
      if (this.shouldRotateBrands()) {
        this.resumeBrandSlideshow();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopSlideshow();
    this.stopBrandSlideshow();
  }

  showSlide(index: number): void {
    this.activeSlide.set((index + this.slides.length) % this.slides.length);
  }

  resumeSlideshow(): void {
    if (
      isPlatformBrowser(this.platformId) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !this.isHovered &&
      !this.hasFocus
    ) {
      this.startSlideshow();
    }
  }

  onMouseEnter(): void {
    this.isHovered = true;
    this.stopSlideshow();
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.resumeSlideshow();
  }

  onFocusIn(): void {
    this.hasFocus = true;
    this.stopSlideshow();
  }

  onFocusOut(): void {
    this.hasFocus = false;
    this.resumeSlideshow();
  }

  showPreviousBrands(): void {
    const brandCount = this.brandSlides().length;
    if (brandCount > 0) {
      this.brandDirection.set('previous');
      this.firstVisibleBrand.set((this.firstVisibleBrand() - 1 + brandCount) % brandCount);
    }
  }

  showNextBrands(): void {
    const brandCount = this.brandSlides().length;
    if (brandCount > 0) {
      this.brandDirection.set('next');
      this.firstVisibleBrand.set((this.firstVisibleBrand() + 1) % brandCount);
    }
  }

  onBrandsMouseEnter(): void {
    this.isBrandsHovered = true;
    this.stopBrandSlideshow();
  }

  onBrandsMouseLeave(): void {
    this.isBrandsHovered = false;
    this.resumeBrandSlideshow();
  }

  onBrandsFocusIn(): void {
    this.hasBrandsFocus = true;
    this.stopBrandSlideshow();
  }

  onBrandsFocusOut(): void {
    this.hasBrandsFocus = false;
    this.resumeBrandSlideshow();
  }

  onBrandLogoError(brand: string): void {
    this.failedBrandLogos.update((failed) => new Set(failed).add(brand));
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const isMobile = window.matchMedia('(max-width: 520px)').matches;
    if (this.isMobile() === isMobile) {
      return;
    }

    this.isMobile.set(isMobile);
    this.stopBrandSlideshow();
    if (this.shouldRotateBrands()) {
      this.resumeBrandSlideshow();
    }
  }

  private shouldRotateBrands(): boolean {
    return this.brandSlides().length > (this.isMobile() ? 4 : 5);
  }

  private startSlideshow(): void {
    if (this.slideshowTimer === undefined) {
      this.slideshowTimer = setInterval(() => {
        this.showSlide(this.activeSlide() + 1);
      }, 6000);
    }
  }

  private stopSlideshow(): void {
    if (this.slideshowTimer !== undefined) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = undefined;
    }
  }

  private resumeBrandSlideshow(): void {
    if (
      isPlatformBrowser(this.platformId) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !this.isBrandsHovered &&
      !this.hasBrandsFocus &&
      this.shouldRotateBrands() &&
      this.brandTimer === undefined
    ) {
      this.brandTimer = setInterval(() => this.showNextBrands(), 3500);
    }
  }

  private stopBrandSlideshow(): void {
    if (this.brandTimer !== undefined) {
      clearInterval(this.brandTimer);
      this.brandTimer = undefined;
    }
  }
}
