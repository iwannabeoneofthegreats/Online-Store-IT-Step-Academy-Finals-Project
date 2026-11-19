import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Client
  },
  {
    path: 'shops',
    renderMode: RenderMode.Client
  },
  {
    path: 'product/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'login',
    renderMode: RenderMode.Client
  },
  {
    path: 'register',
    renderMode: RenderMode.Client
  },
  {
    path: 'shop',
    renderMode: RenderMode.Client
  },
  {
    path: 'categories',
    renderMode: RenderMode.Client
  },
  {
    path: 'categories/:id',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
