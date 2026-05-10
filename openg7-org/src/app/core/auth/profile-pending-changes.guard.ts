import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

export interface PendingProfileChangesAware {
  hasPendingChanges(): boolean;
}

export const profilePendingChangesGuard: CanDeactivateFn<PendingProfileChangesAware> = (
  component,
) => {
  if (!component?.hasPendingChanges || !component.hasPendingChanges()) {
    return true;
  }

  if (typeof window === 'undefined') {
    return true;
  }

  const translate = inject(TranslateService);
  const message = translate.instant('auth.profile.unsavedChangesConfirm');
  return window.confirm(message);
};
