import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/auth/auth.service';
import { of, throwError } from 'rxjs';

import { FeedActionsService } from './feed-actions.service';
import { FeedActionsApiService } from './services/feed-actions-api.service';

describe('FeedActionsService', () => {
  const api = {
    createMine: jasmine.createSpy('createMine'),
  };
  const authState = signal(false);

  beforeEach(() => {
    api.createMine.calls.reset();
    authState.set(false);
    TestBed.configureTestingModule({
      providers: [
        FeedActionsService,
        { provide: FeedActionsApiService, useValue: api },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authState.asReadonly(),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
      ],
    });
  });

  it('does not record unauthenticated actions', async () => {
    authState.set(false);
    const service = TestBed.inject(FeedActionsService);

    const result = await service.record({
      targetType: 'opportunity',
      targetId: 'opportunity-300mw',
      action: 'save',
    });

    expect(result).toBeNull();
    expect(api.createMine).not.toHaveBeenCalled();
  });

  it('records authenticated actions best-effort', async () => {
    authState.set(true);
    api.createMine.and.returnValue(
      of({
        id: 'feed-action-1',
        targetType: 'opportunity',
        targetId: 'opportunity-300mw',
        action: 'save',
      }),
    );
    const service = TestBed.inject(FeedActionsService);

    const result = await service.record(
      {
        targetType: 'opportunity',
        targetId: 'opportunity-300mw',
        action: 'save',
      },
      { idempotencyKey: 'feed-action:save:1' },
    );

    expect(result?.id).toBe('feed-action-1');
    expect(api.createMine).toHaveBeenCalledWith(
      jasmine.objectContaining({
        targetType: 'opportunity',
        targetId: 'opportunity-300mw',
        action: 'save',
        occurredAt: jasmine.any(String),
      }),
      { idempotencyKey: 'feed-action:save:1', suppressErrorToast: true },
    );
  });

  it('swallows logging failures', async () => {
    authState.set(true);
    api.createMine.and.returnValue(throwError(() => new Error('Network failed')));
    const service = TestBed.inject(FeedActionsService);

    const result = await service.record({
      targetType: 'alert',
      targetId: 'alert-001',
      action: 'subscribe',
    });

    expect(result).toBeNull();
  });
});
