import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Routes } from '@angular/router';
import { AuthService } from './services/auth';
import { CartService } from './services/cart';
import { Main } from './pages/main/main/main';
import { Products } from './pages/products/products';
import { Shop } from './pages/shop/shop';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Cart } from './pages/cart/cart';
import { Profile } from './pages/profile/profile';
import { ProductDetail } from './pages/product-detail/product-detail';
import { Favorites } from './pages/favorites/favorites';

const requireCartAuthentication = () => {
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    return true;
  }

  inject(CartService).requireLogin();
  return inject(Router).parseUrl('/login');
};

const requireProfileAuthentication = () =>
  inject(AuthService).isAuthenticated() || inject(Router).parseUrl('/login');

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'shops', component: Shop },
  { path: 'product/:id', component: ProductDetail },
  { path: 'cart', component: Cart, canActivate: [requireCartAuthentication] },
  { path: 'profile', component: Profile, canActivate: [requireProfileAuthentication] },
  { path: 'favorites', component: Favorites, canActivate: [requireProfileAuthentication] },
  { path: 'shop', pathMatch: 'full', redirectTo: 'shops' },
  { path: 'categories', pathMatch: 'full', redirectTo: 'shops' },
  { path: 'categories/:id', component: Products },
];
