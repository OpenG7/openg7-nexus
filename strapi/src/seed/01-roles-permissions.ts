import { ensureRole, setRolePermissions } from '../utils/seed-helpers';

type PermissionMap = Record<string, Record<string, boolean>>;

const baseReadPermissions: PermissionMap = {
  'api::company.company': { find: true, findOne: true },
  'api::exchange.exchange': { find: true, findOne: true },
  'api::feed.feed': { highlights: true },
  'api::hydrocarbon-signal.hydrocarbon-signal': { find: true, findOne: true },
  'api::homepage.homepage': { find: true },
  'api::national-project.national-project': { find: true, findOne: true },
  'api::province.province': { find: true, findOne: true },
  'api::sector.sector': { find: true, findOne: true },
  'api::statistics.statistics': { find: true },
  'api::statistic-insight.statistic-insight': { find: true, findOne: true },
};

function mergePermissions(...sources: PermissionMap[]): PermissionMap {
  return sources.reduce<PermissionMap>((acc, source) => {
    Object.entries(source).forEach(([uid, actions]) => {
      acc[uid] = { ...(acc[uid] ?? {}), ...actions };
    });
    return acc;
  }, {});
}

export default async () => {
  const publicRole = await ensureRole('Public');
  await setRolePermissions(publicRole.id, baseReadPermissions);

  const authenticatedExtra: PermissionMap = {
    'api::connection.connection': {
      create: true,
      history: true,
      findOne: true,
      updateStatus: true,
    },
    'api::company.company': { update: true },
    'api::company-import.company-import': {
      importCompanies: true,
    },
    'api::feed.feed': {
      index: true,
      findOne: true,
      create: true,
      stream: true,
    },
    'api::account-profile.account-profile': {
      me: true,
      exportMe: true,
      sessionsMe: true,
      logoutOtherSessions: true,
      updateMe: true,
      requestEmailChange: true,
    },
    'api::user-favorite.user-favorite': {
      me: true,
      createMe: true,
      deleteMe: true,
    },
    'api::saved-search.saved-search': {
      me: true,
      createMe: true,
      updateMe: true,
      deleteMe: true,
    },
    'api::user-alert.user-alert': {
      me: true,
      createMe: true,
      generateFromSavedSearches: true,
      markReadMe: true,
      markAllReadMe: true,
      deleteReadMe: true,
      deleteMe: true,
    },
  };

  const proExtra: PermissionMap = {
    'api::company.company': { create: true, delete: true },
  };

  const provinceExtra: PermissionMap = {
    'api::company.company': { create: true, update: true },
    'api::company-import.company-import': {
      importCompanies: true,
    },
  };

  const adminOpsExtra: PermissionMap = {
    'api::admin-ops.admin-ops': {
      health: true,
      backups: true,
      imports: true,
      security: true,
    },
  };

  const authenticatedRole = await ensureRole('Authenticated');
  await setRolePermissions(authenticatedRole.id, mergePermissions(baseReadPermissions, authenticatedExtra));

  const proRole = await ensureRole('Pro');
  await setRolePermissions(proRole.id, mergePermissions(baseReadPermissions, authenticatedExtra, proExtra));

  const provinceRole = await ensureRole('Province');
  await setRolePermissions(
    provinceRole.id,
    mergePermissions(baseReadPermissions, authenticatedExtra, provinceExtra)
  );

  const adminRole = await ensureRole('Admin');
  await setRolePermissions(
    adminRole.id,
    mergePermissions(baseReadPermissions, authenticatedExtra, proExtra, provinceExtra, adminOpsExtra)
  );

  const ownerRole = await ensureRole('Owner');
  await setRolePermissions(
    ownerRole.id,
    mergePermissions(baseReadPermissions, authenticatedExtra, proExtra, provinceExtra, adminOpsExtra)
  );
};
