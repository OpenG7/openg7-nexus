import { DialogModule } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  APP_INITIALIZER,
  TransferState,
  importProvidersFrom,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { appConfigProvider } from './app.config.provider';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/http/auth.interceptor';
import { csrfInterceptor } from './core/http/csrf.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { AppTranslateLoader } from './core/i18n/translate-loader';
import { RobotsMetaService } from './core/seo/robots-meta.service';
import { authReducer } from './state/auth/auth.reducer';
import { CatalogMockService } from './state/catalog/catalog-mock.service';
import { catalogReducer } from './state/catalog/catalog.reducer';
import { mapReducer } from './state/map/map.reducer';
import { userReducer } from './state/user/user.reducer';
import { companyImportBulkReducer } from './store/company-import-bulk/company-import-bulk.reducer';
import { ConnectionsEffects } from './store/connections/connections.effects';
import { connectionsReducer } from './store/connections/connections.reducer';
import { feedReducer } from './store/feed/feed.reducer';
import { StatisticsEffects } from './store/statistics/statistics.effects';
import { statisticsReducer } from './store/statistics/statistics.reducer';
import { provideTheme } from './theme/provide-theme';

export const appConfig: ApplicationConfig = {
  providers: [
    appConfigProvider(),
    provideTheme(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([authInterceptor, csrfInterceptor, errorInterceptor])),
    ...provideTranslateService({
      lang: 'fr',
      fallbackLang: 'en',
      loader: provideTranslateLoader(AppTranslateLoader),
    }),
    provideAnimations(),
    importProvidersFrom(DialogModule),
    TransferState,
    provideStore({
      auth: authReducer,
      user: userReducer,
      catalog: catalogReducer,
      map: mapReducer,
      companyImportBulk: companyImportBulkReducer,
      connections: connectionsReducer,
      feed: feedReducer,
      statistics: statisticsReducer,
    }),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const auth = inject(AuthService);
        return () => auth.ensureSessionRestored();
      },
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const loader = inject(CatalogMockService);
        return () => loader.load();
      },
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const robotsMeta = inject(RobotsMetaService);
        return () => robotsMeta.init();
      },
    },
    provideEffects(ConnectionsEffects, StatisticsEffects),
  ],
};
