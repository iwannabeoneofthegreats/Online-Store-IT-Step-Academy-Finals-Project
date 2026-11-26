import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../models/productTypes';
import { CartService } from '../../services/cart';
import { FavoritesService } from '../../services/favorites';
import { ProductCard } from '../../components/product-card/product-card';

@Component({
  selector: 'app-favorites',
  imports: [ProductCard, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites implements OnInit {
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);

  readonly favorites = this.favoritesService.favorites;
  readonly loading = this.favoritesService.loading;
  readonly error = this.favoritesService.error;

  ngOnInit(): void {
    this.favoritesService.loadFavorites();
  }

  loadFavorites(): void {
    this.favoritesService.loadFavorites();
  }

  addToCart(product: Product): void {
    this.cartService.add(product);
  }
}
