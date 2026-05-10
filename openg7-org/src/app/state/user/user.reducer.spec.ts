import { UserActions } from './user.actions';
import { userReducer, initialUserState } from './user.reducer';
import { UserProfile } from './user.selectors';

describe('userReducer', () => {
  const profile: UserProfile = {
    id: 'u1',
    email: 'user@example.com',
    roles: ['editor'],
    premiumActive: false,
  };

  it('should hydrate the profile and permissions', () => {
    const state = userReducer(
      initialUserState,
      UserActions.profileHydrated({ profile, permissions: ['read'] }),
    );

    expect(state).toEqual({ profile, permissions: ['read'] });
  });

  it('should clear the profile slice', () => {
    const hydrated = userReducer(
      initialUserState,
      UserActions.profileHydrated({ profile, permissions: ['read'] }),
    );

    const cleared = userReducer(hydrated, UserActions.profileCleared());

    expect(cleared).toEqual(initialUserState);
  });
});
