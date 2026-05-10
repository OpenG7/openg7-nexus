export const STRAPI_ROUTES = {
  auth: {
    login: '/api/auth/local',
    register: '/api/auth/local/register',
    sendEmailConfirmation: '/api/auth/send-email-confirmation',
    changePassword: '/api/auth/change-password',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  users: {
    root: '/api/users',
    me: '/api/users/me',
    meProfile: '/api/users/me/profile',
    meProfileExport: '/api/users/me/profile/export',
    meProfileSessions: '/api/users/me/profile/sessions',
    meProfileLogoutOthers: '/api/users/me/profile/sessions/logout-others',
    meProfileEmailChange: '/api/users/me/profile/email-change',
    meFavorites: '/api/users/me/favorites',
    meOpportunityOffers: '/api/users/me/opportunity-offers',
    meSavedSearches: '/api/users/me/saved-searches',
    meAlerts: '/api/users/me/alerts',
  },
  upload: {
    files: '/api/upload',
  },
  admin: {
    opsHealth: '/api/admin/ops/health',
    opsBackups: '/api/admin/ops/backups',
    opsImports: '/api/admin/ops/imports',
    opsSecurity: '/api/admin/ops/security',
    opsAiProofs: '/api/admin/ops/ai/proofs',
    opsAiDispatch: '/api/admin/ops/ai/dispatch',
    opsCodexDispatch: '/api/admin/ops/codex/dispatch',
    qualityMatrix: '/api/admin/quality/matrix',
    qualityMatrixRecalculate: '/api/admin/quality/matrix/recalculate',
    qualityMatrixApplyProposal: '/api/admin/quality/matrix/apply-proposal',
    qualityMissionDecisions: '/api/admin/quality/mission-decisions',
  },
} as const;

export const strapiUserById = (id: string | number): string => {
  const userId = encodeURIComponent(String(id));
  return `${STRAPI_ROUTES.users.root}/${userId}`;
};

export const strapiFavoriteById = (id: string | number): string => {
  const favoriteId = encodeURIComponent(String(id));
  return `${STRAPI_ROUTES.users.meFavorites}/${favoriteId}`;
};

export const strapiSavedSearchById = (id: string | number): string => {
  const savedSearchId = encodeURIComponent(String(id));
  return `${STRAPI_ROUTES.users.meSavedSearches}/${savedSearchId}`;
};

export const strapiAlertById = (id: string | number): string => {
  const alertId = encodeURIComponent(String(id));
  return `${STRAPI_ROUTES.users.meAlerts}/${alertId}`;
};

export const strapiAlertReadById = (id: string | number): string => {
  const alertId = encodeURIComponent(String(id));
  return `${STRAPI_ROUTES.users.meAlerts}/${alertId}/read`;
};

export const strapiAlertReadAll = (): string => `${STRAPI_ROUTES.users.meAlerts}/read-all`;
export const strapiAlertDeleteRead = (): string => `${STRAPI_ROUTES.users.meAlerts}/read`;
export const strapiGenerateAlerts = (): string => `${STRAPI_ROUTES.users.meAlerts}/generate`;

export const strapiAdminQualityMissionDecisionById = (id: string): string =>
  `${STRAPI_ROUTES.admin.qualityMissionDecisions}/${encodeURIComponent(id)}`;
