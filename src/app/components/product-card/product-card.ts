import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../models/productTypes';
import { FavoritesService } from '../../services/favorites';
import { ProductRating } from '../product-rating/product-rating';

@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ProductRating, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard implements OnInit {
  readonly product = input.required<Product>();
  readonly shopLayout = input(false);
  readonly addToCartRequested = output<Product>();
  readonly favoritesService = inject(FavoritesService);

  ngOnInit(): void {
    this.favoritesService.loadFavorites();
  }

  toggleFavorite(): void {
    this.favoritesService.toggle(this.product());
  }
}
