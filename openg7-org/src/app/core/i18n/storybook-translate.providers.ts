import { APP_INITIALIZER, Provider } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import en from '../../../assets/i18n/en.json';

function initializeStorybookEnTranslations(translate: TranslateService): () => Promise<void> {
  return async () => {
    translate.setTranslation('en', en as any, true);
    translate.setDefaultLang('en');
    await firstValueFrom(translate.use('en'));
  };
}

export function provideStorybookEnTranslations(): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initializeStorybookEnTranslations,
      deps: [TranslateService],
    },
  ];
}
