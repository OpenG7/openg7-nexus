import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { permissionsGuard } from './core/auth/permissions.guard';
import { profilePendingChangesGuard } from './core/auth/profile-pending-changes.guard';
import { roleGuard } from './core/auth/role.guard';

const ROBOTS_NOINDEX = 'noindex,nofollow';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./domains/home/pages/home.page').then(m => m.HomePage),
  },
  {
    path: 'admin/trust',
    loadComponent: () => import('./domains/admin/pages/admin-trust.page').then(m => m.AdminTrustPage),
    canMatch: [authGuard, roleGuard],
    data: { roles: ['admin'], robots: ROBOTS_NOINDEX },
  },
  {
    path: 'admin/ops',
    loadComponent: () => import('./domains/admin/pages/admin-ops.page').then(m => m.AdminOpsPage),
    canMatch: [authGuard, roleGuard],
    data: { roles: ['admin'], robots: ROBOTS_NOINDEX },
  },
  {
    path: 'admin',
    loadComponent: () => import('./domains/admin/pages/admin.page').then(m => m.AdminPage),
    canMatch: [authGuard, roleGuard],
    data: { roles: ['admin'], robots: ROBOTS_NOINDEX },
  },
  {
    path: 'login',
    loadComponent: () => import('./domains/auth/pages/login.page').then(m => m.LoginPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./domains/auth/pages/forgot-password.page').then(m => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./domains/auth/pages/reset-password.page').then(m => m.ResetPasswordPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./domains/auth/pages/register.page').then(m => m.RegisterPage),
  },
  {
    path: 'companies/register',
    loadComponent: () => import('./domains/enterprise/pages/company-register.page').then(m => m.CompanyRegisterPage),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'import',
    redirectTo: 'importation',
    pathMatch: 'full',
  },
  {
    path: 'imports',
    redirectTo: 'importation',
    pathMatch: 'full',
  },
  {
    path: 'importation',
    loadComponent: () =>
      import('./domains/importation/pages/importation.page').then(m => m.ImportationPage),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'bulk-import',
    redirectTo: 'import/companies/bulk-import',
    pathMatch: 'full',
  },
  {
    path: 'import/bulk',
    redirectTo: 'import/companies/bulk-import',
    pathMatch: 'full',
  },
  {
    path: 'importation/bulk-import',
    redirectTo: 'import/companies/bulk-import',
    pathMatch: 'full',
  },
  {
    path: 'import/companies/bulk-import',
    loadComponent: () =>
      import('./import/companies-bulk-import-page/companies-bulk-import-page.component').then(
        m => m.CompaniesBulkImportPageComponent
      ),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'import/companies',
    loadComponent: () =>
      import('./import/companies-import-page/companies-import-page.component').then(
        m => m.CompaniesImportPageComponent
      ),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./domains/auth/pages/auth-callback.page').then(m => m.AuthCallbackPage),
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'features',
    loadComponent: () => import('./domains/marketing/pages/features.page').then(m => m.FeaturesPage),
  },
  {
    path: 'sectors',
    loadComponent: () =>
      import('./domains/marketing/pages/strategic-sectors.page').then(m => m.StrategicSectorsPage),
  },
  {
    path: 'pricing',
    loadComponent: () => import('./domains/marketing/pages/pricing.page').then(m => m.PricingPage),
  },
  {
    path: 'inscription',
    redirectTo: 'register',
    pathMatch: 'full',
  },
  {
    path: 'registration',
    redirectTo: 'register',
    pathMatch: 'full',
  },
  {
    path: 'statistics',
    loadComponent: () => import('./domains/statistics/pages/statistics.page').then(m => m.StatisticsPage),
  },
  {
    path: 'terms',
    loadComponent: () => import('./domains/static/pages/terms.page').then(m => m.TermsPage),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./domains/static/pages/privacy.page').then(m => m.PrivacyPage),
  },
  {
    path: 'legal',
    loadComponent: () => import('./domains/static/pages/legal.page').then(m => m.LegalPage),
  },
  {
    path: 'credits',
    loadComponent: () => import('./domains/static/pages/credits.page').then(m => m.CreditsPage),
  },
  {
    path: 'governance',
    loadComponent: () => import('./domains/static/pages/governance.page').then(m => m.GovernancePage),
  },
  {
    path: 'preview/homepage',
    loadComponent: () => import('./domains/admin/pages/preview/preview.page').then(m => m.PreviewPage),
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'faq',
    loadComponent: () => import('./domains/static/pages/faq.page').then(m => m.FaqPage),
  },
  {
    path: 'feed',
    loadChildren: () => import('./domains/feed/feature/feed.routes').then(m => m.routes),
  },
  {
    path: 'entreprise/:slug',
    loadComponent: () =>
      import('./domains/enterprise/entreprise/og7-entreprise.component').then(m => m.Og7EntrepriseComponent),
  },
  {
    path: 'linkups',
    loadComponent: () =>
      import('./domains/matchmaking/pages/linkup-history.page').then(m => m.LinkupHistoryPage),
    canMatch: [authGuard],
  },
  {
    path: 'linkups/:id',
    loadComponent: () =>
      import('./domains/matchmaking/pages/linkup-detail.page').then(m => m.LinkupDetailPage),
    canMatch: [authGuard],
  },
  {
    path: 'linkup/:id',
    loadComponent: () =>
      import('./domains/matchmaking/pages/linkup.page').then(m => m.LinkupPage),
    canMatch: [authGuard],
  },
  {
    path: 'partners/:id',
    loadComponent: () =>
      import('./domains/partners/pages/partner-details.page').then(m => m.PartnerDetailsPage),
  },
  {
    path: 'repertoire/:id',
    redirectTo: 'partners/:id',
    pathMatch: 'full',
  },
  {
    path: 'favorites',
    loadComponent: () => import('./domains/account/pages/favorites.page').then(m => m.FavoritesPage),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'saved-searches',
    loadComponent: () =>
      import('./domains/account/pages/saved-searches.page').then(m => m.SavedSearchesPage),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'alerts',
    loadComponent: () => import('./domains/account/pages/alerts.page').then(m => m.AlertsPage),
    canMatch: [authGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'profile',
    loadComponent: () => import('./domains/account/pages/profile.page').then(m => m.ProfilePage),
    canMatch: [authGuard],
    canDeactivate: [profilePendingChangesGuard],
    data: { robots: ROBOTS_NOINDEX },
  },
  {
    path: 'pro',
    loadComponent: () => import('./domains/account/pages/profile.page').then(m => m.ProfilePage),
    canMatch: [authGuard, roleGuard, permissionsGuard],
    canDeactivate: [profilePendingChangesGuard],
    data: {
      roles: ['editor', 'admin'],
      permissions: ['write'],
      robots: ROBOTS_NOINDEX,
    },
  },
  {
    path: 'access-denied',
    loadComponent: () => import('./domains/auth/pages/access-denied.page').then(m => m.AccessDeniedPage),
  },
  {
    path: '_dev/component-lab',
    //canMatch: [featureFlagGuard('componentLab')],
    loadComponent: () => import('./domains/developer/pages/component-lab.page').then(m => m.ComponentLabPage),
    data: { robots: ROBOTS_NOINDEX },
  },
];
