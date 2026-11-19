import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { ProductRating } from '../../components/product-rating/product-rating';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, ProductRating, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  readonly cartService = inject(CartService);

  checkout() {
    this.cartService.checkout()
  }
}
