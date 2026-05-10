import { createReducer, on } from '@ngrx/store';

import { UserActions } from './user.actions';
import { UserState } from './user.selectors';

export const initialUserState: UserState = {
  profile: null,
  permissions: [],
};

export const userReducer = createReducer(
  initialUserState,
  on(UserActions.profileHydrated, (state, { profile, permissions }) => ({
    ...state,
    profile,
    permissions,
  })),
  on(UserActions.profileCleared, () => ({ ...initialUserState })),
);
