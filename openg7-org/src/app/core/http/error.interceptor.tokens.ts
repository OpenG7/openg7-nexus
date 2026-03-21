import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Marks requests for which the global error interceptor should not trigger
 * the fallback toast notification when an HTTP error occurs. Services can
 * opt-in when they are prepared to gracefully handle errors (for instance
 * by returning demo data).
 */
export const SUPPRESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function createSilentHttpContext(): HttpContext {
	return new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
}
