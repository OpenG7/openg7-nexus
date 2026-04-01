import { Buffer } from 'buffer';

import { HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthActions, UserActions } from '@app/state';
import { AppState } from '@app/state/app.state';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, firstValueFrom, tap, throwError } from 'rxjs';

import { STRAPI_ROUTES } from '../api/strapi.routes';
import { HttpClientService } from '../http/http-client.service';
import { NotificationStore, NotificationStoreApi } from '../observability/notification.store';
import { RbacFacadeService } from '../security/rbac.facade';
import { Role } from '../security/rbac.policy';
import { TokenStorageService } from '../security/token-storage.service';

import {
  ActiveSessionsResponse,
  AuthResponse,
  AuthUser,
  AuthUserPayload,
  ChangePasswordPayload,
  EmailChangePayload,
  EmailChangeResponse,
  LoginResponse,
  LogoutOtherSessionsResponse,
  JwtPayload,
  ProfileResponse,
  RegisterResponse,
  UpdateProfilePayload,
} from './auth.types';
import { OidcProvider, OidcService } from './oidc.service';


@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/auth ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Auth ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AuthService gérée par le framework.
 */
export class AuthService {
  private readonly restoreSessionPromise: Promise<void>;
  private sessionPersistencePromise: Promise<void> = Promise.resolve();
  private readonly userCacheKey = 'auth_user_cache_v1';
  private unauthorizedSessionHandlingInFlight = false;
  private tokenSig = signal<string | null>(null);
  readonly token = this.tokenSig.asReadonly();
  readonly token$ = toObservable(this.token);

  private userSig = signal<AuthUser | null>(null);
  readonly user = this.userSig.asReadonly();
  readonly user$ = toObservable(this.user);

  readonly isAuthenticated = computed(() => Boolean(this.tokenSig() && this.userSig()));
  readonly isAuthenticated$ = toObservable(this.isAuthenticated);

  readonly isPremium = computed(() => Boolean(this.userSig()?.premiumActive));
  readonly isPremium$ = toObservable(this.isPremium);

  readonly currentPlanId = computed(() => {
    const user = this.userSig();
    if (user?.premiumPlan) {
      return user.premiumPlan;
    }
    return user?.premiumActive ? 'premium' : null;
  });
  readonly currentPlanId$ = toObservable(this.currentPlanId);

  readonly jwt = computed<JwtPayload | null>(() => {
    const token = this.tokenSig();
    if (!token) return null;
    try {
      const base64 = token.split('.')[1];
      const json =
        typeof atob === 'function'
          ? atob(base64)
          : Buffer.from(base64, 'base64').toString('utf-8');
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  });
  readonly jwt$ = toObservable(this.jwt);

  constructor(
    private http: HttpClientService,
    private tokenStorage: TokenStorageService,
    private oidc: OidcService,
    @Inject(NotificationStore) private notifications: NotificationStoreApi,
    private translate: TranslateService,
    private rbac: RbacFacadeService,
    private store: Store<AppState>
  ) {
    this.restoreSessionPromise = this.restoreSession().catch(() => undefined);
    this.syncRbac(this.userSig());
  }

  /**
   * Contexte : Called by guards during bootstrap navigation.
   * Raison d’être : Ensures persisted token restoration has completed before evaluating route access.
   * @returns Promise resolved once initial token restoration has finished.
   */
  async ensureSessionRestored(): Promise<void> {
    await this.restoreSessionPromise;
  }

  /**
   * Contexte : Used by auth flows that should not navigate away before the session token is durably stored.
   * Raison d’être : Avoids race conditions between post-login navigation and async token persistence.
   * @returns Promise resolved once the latest token write attempt has completed.
   */
  async ensureSessionPersisted(): Promise<void> {
    await this.sessionPersistencePromise;
  }

  /**
   * Contexte : Called by the email/password login form when the user submits their credentials.
   * Raison d’être : Delegates authentication to the backend and persists the resulting session state.
   * @param credentials Email/password pair entered by the user.
   * @returns Observable emitting the login response payload.
   */
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    const payload = {
      identifier: credentials.email.trim(),
      password: credentials.password,
    };

    return this.http.post<LoginResponse>(STRAPI_ROUTES.auth.login, payload, { withCredentials: false }).pipe(
      tap((res) => this.persistAuth(res))
    );
  }

  /**
   * Contexte : Triggered by the registration form for self-serve account creation.
   * Raison d’être : Calls the registration endpoint and stores the returned session upon success.
   * @param credentials Email/password pair provided during sign-up.
   * @returns Observable emitting the register response payload.
   */
  register(credentials: { email: string; password: string; username?: string }): Observable<RegisterResponse> {
    const payload = {
      ...credentials,
      username: credentials.username?.trim() || credentials.email,
    };

    return this.http.post<RegisterResponse>(STRAPI_ROUTES.auth.register, payload, { withCredentials: false }).pipe(
      tap((res) => {
        if (this.hasSessionPayload(res)) {
          this.persistAuth(res);
        }
      })
    );
  }

  /**
   * Contexte : Called by login screens when users request a fresh account activation email.
   * Raison d’être : Delegates to Strapi users-permissions confirmation flow.
   * @param payload Object containing the email address to target.
   * @returns Observable emitting the API acknowledgement.
   */
  sendEmailConfirmation(payload: {
    email: string;
  }): Observable<{ email: string; sent: boolean }> {
    return this.http.post<{ email: string; sent: boolean }>(
      STRAPI_ROUTES.auth.sendEmailConfirmation,
      payload,
      { withCredentials: false }
    );
  }

  /**
   * Contexte : Triggered by authenticated account pages when a user wants to update their password.
   * Raison d’être : Delegates to Strapi change-password endpoint and refreshes local auth state if a new token is issued.
   * @param payload Current and new password payload.
   * @returns Observable emitting the updated auth payload.
   */
  changePassword(payload: ChangePasswordPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(STRAPI_ROUTES.auth.changePassword, payload).pipe(
      tap((response) => this.persistAuth(response))
    );
  }

  /**
   * Contexte : Called by profile security settings when the user requests an email change.
   * Raison d’être : Starts the email-change confirmation flow on the backend.
   * @param payload Current password and next email address.
   * @returns Observable with backend acknowledgement.
   */
  requestEmailChange(payload: EmailChangePayload): Observable<EmailChangeResponse> {
    return this.http.post<EmailChangeResponse>(STRAPI_ROUTES.users.meProfileEmailChange, payload);
  }

  /**
   * Contexte : Triggered from account settings when the user requests a data portability export.
   * Raison d’être : Retrieves the backend-generated account export payload as a downloadable JSON blob.
   * @returns Observable emitting the export file payload.
   */
  exportProfileData(): Observable<Blob> {
    return this.http.get(STRAPI_ROUTES.users.meProfileExport, { responseType: 'blob' });
  }

  /**
   * Contexte : Used by account security settings to display active and revoked device sessions.
   * Raison d’être : Retrieves the server-side session snapshot tied to the authenticated user.
   * @returns Observable emitting the current session registry view.
   */
  getActiveSessions(): Observable<ActiveSessionsResponse> {
    return this.http.get<ActiveSessionsResponse>(STRAPI_ROUTES.users.meProfileSessions);
  }

  /**
   * Contexte : Triggered by profile security actions to disconnect all other devices.
   * Raison d’être : Rotates session version server-side, issues a fresh JWT for the current client and persists it locally.
   * @returns Observable emitting the updated auth/session payload.
   */
  logoutOtherSessions(): Observable<LogoutOtherSessionsResponse> {
    return this.http
      .post<LogoutOtherSessionsResponse>(STRAPI_ROUTES.users.meProfileLogoutOthers, {})
      .pipe(tap((response) => this.persistAuth(response)));
  }

  /**
   * Contexte : Invoked when a user chooses an external identity provider to sign in.
   * Raison d’être : Delegates to the OIDC service to start the PKCE redirect flow.
   * @param provider Identifier of the OIDC provider to use.
   * @param options Optional redirect target to resume after login.
   * @returns Promise resolved once navigation to the provider has been initiated.
   */
  loginWithOidc(provider: OidcProvider, options?: { redirectUrl?: string }): Promise<void> {
    return this.oidc.startSignIn(provider, options?.redirectUrl);
  }

  /**
   * Contexte : Called by the callback page after exchanging the OIDC code for tokens.
   * Raison d’être : Persists the authenticated session returned by the backend.
   * @param response Auth payload returned by the OIDC callback endpoint.
   * @returns void
   */
  completeOidcLogin(response: AuthResponse): void {
    this.persistAuth(response);
  }

  /**
   * Contexte : Triggered when the user explicitly signs out or when the session expires.
   * Raison d’être : Clears tokens, user state and RBAC context across the app.
   * @returns void
   */
  logout(): void {
    void this.clearSession();
  }

  /**
   * Contexte : Invoked by HTTP infrastructure when an authenticated request receives 401.
   * Raison d'etre : Clears local auth state exactly once for a burst of unauthorized responses.
   * @returns True when a local session was present and has been invalidated.
   */
  handleUnauthorizedSession(): boolean {
    const hasLocalSession = Boolean(this.tokenSig() || this.userSig());
    if (!hasLocalSession || this.unauthorizedSessionHandlingInFlight) {
      return false;
    }

    this.unauthorizedSessionHandlingInFlight = true;
    void this.clearSession().finally(() => {
      this.unauthorizedSessionHandlingInFlight = false;
    });
    return true;
  }

  /**
   * Contexte : Used by account pages to refresh the authenticated user profile.
   * Raison d’être : Fetches profile data and synchronises local state accordingly.
   * @returns Observable emitting the latest profile payload.
   */
  getProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(STRAPI_ROUTES.users.meProfile).pipe(
      tap((user) => this.hydrateUserProfile(user))
    );
  }

  /**
   * Contexte : Triggered by profile forms when the user saves updates.
   * Raison d’être : Submits the updated profile to the API and refreshes local state.
   * @param payload Profile fields to update.
   * @returns Observable emitting the updated profile.
   */
  updateProfile(payload: UpdateProfilePayload): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(STRAPI_ROUTES.users.meProfile, payload).pipe(
      tap((user) => this.hydrateUserProfile(user))
    );
  }

  /**
   * Contexte : Called by the forgot-password form when a user asks for a reset link.
   * Raison d’être : Triggers the backend email flow and surfaces a toast feedback.
   * @param payload Object containing the email address to reset.
   * @returns Observable completing once the request is handled.
   */
  requestPasswordReset(payload: { email: string }): Observable<void> {
    return this.http.post<void>(STRAPI_ROUTES.auth.forgotPassword, payload, { withCredentials: false }).pipe(
      tap(() =>
        this.notifications.success(
          this.translate.instant('auth.forgotPassword.success'),
          { source: 'auth', metadata: { action: 'forgot-password' } }
        )
      ),
      catchError((error) =>
        this.handleError(error, 'auth.errors.passwordResetRequest')
      )
    );
  }

  /**
   * Contexte : Executed by the reset-password page after the user sets a new password.
   * Raison d’être : Confirms the reset with the backend and notifies the user of success or failure.
   * @param payload Token and new password selected by the user.
   * @returns Observable completing when the reset has been processed.
   */
  resetPassword(payload: { token: string; password: string }): Observable<void> {
    return this.http.post<void>(STRAPI_ROUTES.auth.resetPassword, payload, { withCredentials: false }).pipe(
      tap(() =>
        this.notifications.success(
          this.translate.instant('auth.resetPassword.success'),
          { source: 'auth', metadata: { action: 'reset-password' } }
        )
      ),
      catchError((error) => this.handleError(error, 'auth.errors.resetPassword'))
    );
  }

  /**
   * Contexte : Used by billing UI to display the active subscription tier.
   * Raison d’être : Provides synchronous access to the computed plan identifier.
   * @returns The plan identifier or null when no subscription is active.
   */
  currentPlan(): string | null {
    return this.currentPlanId();
  }

  private syncRbac(user: AuthUser | null): void {
    const roles = user?.roles ?? [];
    const role = this.resolveRole(roles);
    this.rbac.setContext({ role, isPremium: Boolean(user?.premiumActive) });
  }

  private resolveRole(roles: readonly string[]): Role {
    if (roles.includes('admin') || roles.includes('owner')) {
      return 'admin';
    }
    if (roles.includes('editor') || roles.includes('pro')) {
      return 'editor';
    }
    return 'visitor';
  }

  private persistAuth(res: AuthResponse): void {
    const token = typeof res.jwt === 'string' ? res.jwt.trim() : '';
    if (!token) {
      this.sessionPersistencePromise = Promise.resolve();
      return;
    }

    this.sessionPersistencePromise = this.tokenStorage.setToken(token).catch(() => undefined);
    this.tokenSig.set(token);
    const user = this.normalizeUser(res.user);
    this.userSig.set(user);
    this.persistUserCache(user);
    this.syncRbac(user);
    const jwtExp = this.jwt()?.exp ?? null;
    this.store.dispatch(AuthActions.sessionHydrated({ user, jwtExp }));
    this.store.dispatch(
      UserActions.profileHydrated({ profile: user, permissions: user.roles ?? [] })
    );
  }

  private async restoreSession(): Promise<void> {
    const token = await this.tokenStorage.getToken();
    // Avoid clobbering a fresh login token if restore resolves later.
    if (this.tokenSig() === null) {
      this.tokenSig.set(token);
    }

    if (!token) {
      this.clearUserCache();
      return;
    }

    if (this.userSig() === null) {
      const cachedUser = this.readCachedUser();
      if (cachedUser) {
        this.hydrateUserProfile(cachedUser);
      }
    }

    try {
      const profile = await firstValueFrom(
        this.http.get<ProfileResponse>(STRAPI_ROUTES.users.meProfile)
      );

      // Ignore stale restore cycles when a newer session already took over.
      if (this.tokenSig() !== token) {
        return;
      }

      this.hydrateUserProfile(profile);
    } catch (error) {
      if (this.tokenSig() === token && this.shouldClearSessionForRestoreError(error)) {
        await this.clearSession();
      }
    }
  }

  private hydrateUserProfile(rawUser: AuthUser | AuthUserPayload): void {
    const user = this.normalizeUser(rawUser);
    this.userSig.set(user);
    this.persistUserCache(user);
    this.syncRbac(user);
    const jwtExp = this.jwt()?.exp ?? null;
    if (this.tokenSig()) {
      this.store.dispatch(AuthActions.sessionHydrated({ user, jwtExp }));
    }
    this.store.dispatch(
      UserActions.profileHydrated({ profile: user, permissions: user.roles ?? [] })
    );
  }

  private normalizeUser(rawUser: AuthUser | AuthUserPayload | null | undefined): AuthUser {
    const record =
      rawUser && typeof rawUser === 'object'
        ? (rawUser as Record<string, unknown>)
        : {};

    const normalizedId =
      typeof record['id'] === 'string' || typeof record['id'] === 'number'
        ? String(record['id'])
        : '';
    const normalizedEmail =
      typeof record['email'] === 'string' && record['email'].trim().length > 0
        ? record['email'].trim().toLowerCase()
        : '';

    return {
      ...(record as Partial<AuthUser>),
      id: normalizedId,
      email: normalizedEmail,
      roles: this.extractRoles(record),
    };
  }

  private extractRoles(record: Record<string, unknown>): string[] {
    const roles = new Set<string>();

    const pushRole = (value: unknown) => {
      const normalized = this.normalizeRole(value);
      if (normalized) {
        roles.add(normalized);
      }
    };

    if (Array.isArray(record['roles'])) {
      for (const role of record['roles']) {
        pushRole(role);
      }
    } else if (record['roles'] != null) {
      pushRole(record['roles']);
    }

    const role = record['role'];
    if (typeof role === 'string') {
      pushRole(role);
    } else if (role && typeof role === 'object') {
      const roleRecord = role as Record<string, unknown>;
      pushRole(roleRecord['type']);
      pushRole(roleRecord['name']);
    }

    return Array.from(roles);
  }

  private normalizeRole(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private hasSessionPayload(payload: RegisterResponse | AuthResponse): payload is AuthResponse {
    return (
      typeof (payload as { jwt?: unknown }).jwt === 'string' &&
      (payload as { jwt: string }).jwt.trim().length > 0
    );
  }

  private async clearSession(): Promise<void> {
    await this.tokenStorage.clear();
    this.tokenSig.set(null);
    this.userSig.set(null);
    this.clearUserCache();
    this.syncRbac(null);
    this.store.dispatch(AuthActions.sessionCleared());
    this.store.dispatch(UserActions.profileCleared());
  }

  private shouldClearSessionForRestoreError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 401 || error.status === 403;
    }
    return false;
  }

  private readCachedUser(): AuthUser | null {
    const storages = this.getCacheStorages();
    for (let index = 0; index < storages.length; index += 1) {
      const storage = storages[index];
      const raw = storage.getItem(this.userCacheKey);
      if (!raw) {
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as AuthUserPayload;
        const user = this.normalizeUser(parsed);
        if (!user.id || !user.email) {
          storage.removeItem(this.userCacheKey);
          continue;
        }
        if (index > 0 && storages.length > 0) {
          try {
            storages[0].setItem(this.userCacheKey, JSON.stringify(user));
            storage.removeItem(this.userCacheKey);
          } catch {
            // Ignore migration failures and continue with the cached value.
          }
        }
        return user;
      } catch {
        storage.removeItem(this.userCacheKey);
      }
    }
    return null;
  }

  private persistUserCache(user: AuthUser): void {
    for (const storage of this.getCacheStorages()) {
      try {
        storage.setItem(this.userCacheKey, JSON.stringify(user));
        return;
      } catch {
        // Try the next available storage backend.
      }
    }
  }

  private clearUserCache(): void {
    for (const storage of this.getCacheStorages()) {
      try {
        storage.removeItem(this.userCacheKey);
      } catch {
        // Ignore clear failures.
      }
    }
  }

  private getCacheStorages(): Storage[] {
    const local = this.getSafeStorage('localStorage');
    const session = this.getSafeStorage('sessionStorage');
    if (local && session && local !== session) {
      return [local, session];
    }
    if (local) {
      return [local];
    }
    if (session) {
      return [session];
    }
    return [];
  }

  private getSafeStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
    const candidate =
      typeof window !== 'undefined'
        ? window[kind]
        : (globalThis as { localStorage?: Storage; sessionStorage?: Storage })[kind];
    if (!candidate) {
      return null;
    }
    try {
      return candidate;
    } catch {
      return null;
    }
  }

  private handleError(error: unknown, fallbackKey: string): Observable<never> {
    const message = this.extractErrorMessage(error) ?? this.translate.instant(fallbackKey);
    this.notifications.error(message, {
      source: 'auth',
      context: error,
      metadata: { fallbackKey },
      deliver: { email: true },
    });
    return throwError(() => message);
  }

  private extractErrorMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      if (typeof payload === 'string' && payload.trim()) {
        return payload;
      }
      if (payload && typeof payload === 'object') {
        const candidate = (payload as { message?: unknown }).message;
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate;
        }
        if (Array.isArray(candidate)) {
          const first = candidate.find((item) => typeof item === 'string' && item.trim());
          if (typeof first === 'string') {
            return first;
          }
        }
      }
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
      if (typeof error.statusText === 'string' && error.statusText.trim()) {
        return error.statusText;
      }
    }

    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    if (error && typeof error === 'object') {
      const candidate = (error as { message?: unknown }).message;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }

    return null;
  }
}
