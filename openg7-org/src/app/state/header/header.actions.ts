import { createAction, props } from '@ngrx/store';

export const searchRequested = createAction('[Header] Search Requested', props<{ q: string }>());
