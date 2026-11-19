// ── მომხმარებელი ──
export interface UserDetails {
  phoneNumber: string | null;
  address: string | null;
  dob: string | null;
  pictureUrl: string | null;
}

export interface User {
  id: number;
  email: string;
  role: string;
  lastName: string;
  firstName: string;
  details: UserDetails;
}

export interface UserResponse {
  data: User;
}

// ── ავტორიზაცია ──
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  data: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  data: AuthTokens;
}

// ── კატეგორიები ──
export interface Category {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
  productCount: number;
  canDelete: boolean;
}

export interface CategoriesResponse {
  data: Category[];
}

// ── პროდუქტები ──
export interface Product {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  imageUrl?: string;
  price: number;
  stock: number;
  rating: number;
  createdAt: string;
  isFavorite: boolean;
  canDelete?: boolean;
  category: Category;
}

export interface BrandFeature {
  name: string;
  logoUrl: string;
}

export interface ProductsResponse {
  data: {
    items: Product[] | null;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    hasMore: boolean;
  };
}

// კალათა
export interface CartItem {
  id: number;                   // კალათის id (itemId)
  quantity: number;
  price: number;
  totalPrice: number;
  product: Product;
}

export interface CartResponse {
  data: {
    items: CartItem[] | null;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
}

export interface EditQuantityRequest {
  itemId: number;               // კალათის id და არა productId
  quantity: number;
}

// ── შეფასებები ──

export interface Review {
  id: number;
  rating: number;
  createdAt: string;
  user: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export interface ReviewPageResponse {
  items: Review[] | null;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasMore: boolean;
}

export type ReviewsResponse =
  | ReviewPageResponse
  | { data: ReviewPageResponse };

export interface AddReviewRequest {
  productId: number;
  rate: number;
}

export interface CheckoutResponse {
  message: string;
  itemCount: number;
}