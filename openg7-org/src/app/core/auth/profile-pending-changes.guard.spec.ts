import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';

import { profilePendingChangesGuard } from './profile-pending-changes.guard';

describe('profilePendingChangesGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: { instant: (key: string) => key } }],
    });
  });

  it('allows navigation when there are no pending changes', () => {
    const canLeave = TestBed.runInInjectionContext(() =>
      profilePendingChangesGuard(
        { hasPendingChanges: () => false },
        null as any,
        null as any,
        null as any,
      ),
    );

    expect(canLeave).toBeTrue();
  });

  it('asks confirmation when there are pending changes', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    const canLeave = TestBed.runInInjectionContext(() =>
      profilePendingChangesGuard(
        { hasPendingChanges: () => true },
        null as any,
        null as any,
        null as any,
      ),
    );

    expect(window.confirm).toHaveBeenCalledWith('auth.profile.unsavedChangesConfirm');
    expect(canLeave).toBeTrue();
  });
});
