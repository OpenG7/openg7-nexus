import { createReducer, on } from '@ngrx/store';

import { AuthActions } from './auth.actions';
import { AuthState } from './auth.selectors';

export const initialAuthState: AuthState = {
  user: null,
  jwtExp: null,
};

export const authReducer = createReducer(
  initialAuthState,
  on(AuthActions.sessionHydrated, (state, { user, jwtExp }) => ({
    ...state,
    user,
    jwtExp,
  })),
  on(AuthActions.sessionCleared, () => ({ ...initialAuthState })),
);
