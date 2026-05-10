import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { TokenStorageService } from '../security/token-storage.service';

/**
 * Contexte : Registered globally so every outgoing request can transparently include the auth bearer token.
 * Raison d’être : Reads the token from {@link TokenStorageService} and injects it when the caller has not set one explicitly.
 * @param req Original HTTP request emitted by Angular.
 * @param next Handler used to forward the request.
 * @returns Observable producing the HTTP event stream with optional Authorization header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  if (req.headers.has('Authorization')) {
    return next(req);
  }

  const tokenService = inject(TokenStorageService);
  return from(tokenService.getToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }

      return next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        }),
      );
    }),
  );
};

function isAuthEndpoint(url: string): boolean {
  if (!url) {
    return false;
  }

  if (/^\/api\/auth(?:\/|$)/.test(url)) {
    return true;
  }

  try {
    const normalized = new URL(
      url,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    );
    return /^\/api\/auth(?:\/|$)/.test(normalized.pathname);
  } catch {
    return false;
  }
}
