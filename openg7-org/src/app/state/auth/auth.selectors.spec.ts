import {
  selectAuthState,
  selectIsAuthenticated,
  selectUser,
  selectUserRoles,
  selectJwtExp,
  AuthState,
  AuthUser,
} from './auth.selectors';

describe('Auth Selectors', () => {
  const user: AuthUser = { id: 'u1', email: 'u1@example.com', roles: ['admin'] };
  const state: { auth: AuthState } = {
    auth: {
      user,
      jwtExp: 12345,
    },
  };

  it('should select auth state', () => {
    expect(selectAuthState(state)).toEqual(state.auth);
  });

  it('should select isAuthenticated', () => {
    expect(selectIsAuthenticated(state)).toBeTrue();
  });

  it('should select user', () => {
    expect(selectUser(state)).toEqual(user);
  });

  it('should select user roles', () => {
    expect(selectUserRoles(state)).toEqual(['admin']);
  });

  it('should select jwt exp', () => {
    expect(selectJwtExp(state)).toBe(12345);
  });
});
