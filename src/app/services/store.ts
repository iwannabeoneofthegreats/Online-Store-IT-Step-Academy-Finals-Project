import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';
import {
  AddToCartRequest,
  AddReviewRequest,
  CategoriesResponse,
  CartResponse,
  EditQuantityRequest,
  Product,
  ProductsResponse,
  ReviewsResponse,
  CheckoutResponse,
} from '../models/productTypes';

@Injectable({
  providedIn: 'root',
})
export class StoreService {

  private http = inject(HttpClient);

  readonly searchTerm = signal('');
  private apiUrl = 'https://shopapi.stepacademy.ge/api';

  getCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(
      `${this.apiUrl}/categories`
    );
  }

  getProductsByCategory(id: number): Observable<ProductsResponse> {
    return this.getProductsByCategoryPage(id, 1, 100);
  }

  getProductsPageByCategory(
    id: number,
    page: number,
    pageSize = 3,
  ): Observable<ProductsResponse> {
    return this.getProductsByCategoryPage(id, page, pageSize);
  }

  getAllProductsByCategory(id: number): Observable<Product[]> {
    return this.getProductsByCategoryPage(id, 1, 100).pipe(
      expand((response) =>
        response.data.hasMore
          ? this.getProductsByCategoryPage(
              id,
              response.data.currentPage + 1,
              100,
            )
          : EMPTY,
      ),
      reduce(
        (products, response) => products.concat(response.data.items ?? []),
        [] as Product[],
      ),
    );
  }

  private getProductsByCategoryPage(
    id: number,
    page: number,
    pageSize: number,
  ): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(
      `${this.apiUrl}/products/filter`,
      {
        params: new HttpParams()
          .set('CategoryId', id)
          .set('Take', pageSize)
          .set('Page', page),
      }
    );
  }

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${this.apiUrl}/cart`);
  }

  addToCart(body: AddToCartRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/cart/add-to-cart`, body);
  }

  removeFromCart(itemId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/cart/remove-from-cart/${itemId}`);
  }

  editQuantity(body: EditQuantityRequest): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/cart/edit-quantity`, body);
  }

  getFavorite(page = 1, take = 10): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(`${this.apiUrl}/favorites`, {
      params: { Page: page, Take: take },
    });
  }

  getAllFavorites(): Observable<Product[]> {
    return this.getFavorite(1, 100).pipe(
      expand((response) =>
        response.data.hasMore
          ? this.getFavorite(response.data.currentPage + 1, 100)
          : EMPTY,
      ),
      reduce(
        (products, response) => products.concat(response.data.items ?? []),
        [] as Product[],
      ),
    );
  }

  addFavorite(productId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/favorites/${productId}`, null);
  }

  removeFavorite(productId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/favorites/${productId}`);
  }

  getReviews(productId: number, page = 1, take = 10): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(
      `${this.apiUrl}/reviews/${productId}`,
      {
        params: { Page: page, Take: take },
      },
    );
  }

  addReview(body: AddReviewRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/reviews`, body);
  }

  deleteReview(reviewId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/reviews/${reviewId}`);
  }

checkout(): Observable<CheckoutResponse> {
  return this.http.post<CheckoutResponse>(
    `${this.apiUrl}/users/checkout`,
    {},
  );
}

}