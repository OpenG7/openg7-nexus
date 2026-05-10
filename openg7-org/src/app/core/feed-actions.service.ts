import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth/auth.service';
import {
  CreateFeedActionPayload,
  FeedActionRecord,
  FeedActionsApiService,
  PersistFeedActionOptions,
} from './services/feed-actions-api.service';

@Injectable({ providedIn: 'root' })
export class FeedActionsService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(FeedActionsApiService);

  async record(
    payload: CreateFeedActionPayload,
    options: PersistFeedActionOptions = {},
  ): Promise<FeedActionRecord | null> {
    if (!this.auth.isAuthenticated()) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.api.createMine(
          {
            ...payload,
            occurredAt: payload.occurredAt ?? new Date().toISOString(),
          },
          {
            ...options,
            suppressErrorToast: options.suppressErrorToast ?? true,
          },
        ),
      );
    } catch {
      return null;
    }
  }
}
