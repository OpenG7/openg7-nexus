import {
  selectUserState,
  selectUserProfile,
  selectUserPermissions,
  UserProfile,
  UserState,
} from './user.selectors';

describe('User Selectors', () => {
  const profile: UserProfile = { id: '1', email: 'alice@example.com', roles: ['reader'] };
  const state: { user: UserState } = {
    user: {
      profile,
      permissions: ['read', 'write'],
    },
  };

  it('should select user state', () => {
    expect(selectUserState(state)).toEqual(state.user);
  });

  it('should select user profile', () => {
    expect(selectUserProfile(state)).toEqual(profile);
  });

  it('should select user permissions', () => {
    expect(selectUserPermissions(state)).toEqual(['read', 'write']);
  });
});
