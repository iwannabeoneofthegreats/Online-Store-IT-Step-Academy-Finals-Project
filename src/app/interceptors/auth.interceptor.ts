import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;
  const headers: Record<string, string> = {
    'X-STEP-KEY': environment.stepKey,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(req.clone({ setHeaders: headers }));
};
