import { AuthUser } from '@app/core/auth/auth.types';

import { AuthActions } from './auth.actions';
import { authReducer, initialAuthState } from './auth.reducer';

describe('authReducer', () => {
  const user: AuthUser = { id: 'u1', email: 'user@example.com', roles: ['admin'] };

  it('should hydrate session state', () => {
    const state = authReducer(
      initialAuthState,
      AuthActions.sessionHydrated({ user, jwtExp: 1234 }),
    );

    expect(state).toEqual({ user, jwtExp: 1234 });
  });

  it('should clear session state', () => {
    const hydrated = authReducer(
      initialAuthState,
      AuthActions.sessionHydrated({ user, jwtExp: 1234 }),
    );

    const cleared = authReducer(hydrated, AuthActions.sessionCleared());

    expect(cleared).toEqual(initialAuthState);
  });
});
