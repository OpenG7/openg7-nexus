const DEV_ENVIRONMENTS = new Set(['development', 'dev', 'integration', 'test']);
const DEFAULT_ADMIN_EMAIL = 'contact@openg7.org';
const DEFAULT_ADMIN_PASSWORD = 'change-me';
const DEFAULT_ADMIN_FIRSTNAME = 'Admin';
const DEFAULT_ADMIN_LASTNAME = 'User';
const SUPER_ADMIN_CODE = 'strapi-super-admin';
const DEFAULT_WEB_ADMIN_ROLE = 'Owner';

function isSeedAdminAllowed(): boolean {
  const explicitFlag = process.env.STRAPI_SEED_ADMIN_ALLOWED?.trim().toLowerCase();
  if (explicitFlag === 'false' || explicitFlag === '0' || explicitFlag === 'no') {
    return false;
  }

  if (explicitFlag === 'true' || explicitFlag === '1' || explicitFlag === 'yes') {
    return true;
  }

  const environment = (process.env.STRAPI_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
  if (!environment) {
    return true;
  }
  return DEV_ENVIRONMENTS.has(environment);
}

function readNonEmpty(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function isPasswordHashed(password: string | null | undefined): boolean {
  if (!password) {
    return false;
  }

  return /^\$2[aby]\$/.test(password) || password.startsWith('$argon2');
}

function normalizeRoleName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

async function resolveUsersPermissionsRoleId(
  preferredRoleName: string,
): Promise<number | string | null> {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const roles = (await roleQuery.findMany()) as Array<{
    id: number | string;
    name?: string;
    type?: string;
  }>;
  if (!Array.isArray(roles) || roles.length === 0) {
    return null;
  }

  const candidates = [
    normalizeRoleName(preferredRoleName),
    normalizeRoleName(DEFAULT_WEB_ADMIN_ROLE),
    normalizeRoleName('Admin'),
    normalizeRoleName('Authenticated'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const match = roles.find((role) => {
      const roleName = normalizeRoleName(role.name);
      const roleType = normalizeRoleName(role.type);
      return roleName === candidate || roleType === candidate;
    });

    if (match?.id !== undefined && match.id !== null) {
      return match.id;
    }
  }

  return roles[0]?.id ?? null;
}

async function ensureUsersPermissionsAdminUser(params: {
  email: string;
  password: string;
  adminPasswordHash?: string | null;
}): Promise<void> {
  const { email, password, adminPasswordHash } = params;
  const usersPermissionsUserService = strapi.plugin('users-permissions').service('user') as {
    add: (values: Record<string, unknown>) => Promise<unknown>;
    edit: (userId: number | string, values: Record<string, unknown>) => Promise<unknown>;
    validatePassword: (password: string, hash: string) => Promise<boolean>;
  };
  const userQuery = strapi.db.query('plugin::users-permissions.user');
  const hasAdminPasswordHash = isPasswordHashed(adminPasswordHash);

  const targetRoleName = readNonEmpty(process.env.STRAPI_WEB_ADMIN_ROLE, DEFAULT_WEB_ADMIN_ROLE);
  const roleId = await resolveUsersPermissionsRoleId(targetRoleName);
  if (roleId === null) {
    throw new Error('No users-permissions role available to provision the web admin user.');
  }

  const existing = (await userQuery.findOne({
    where: {
      $or: [{ email }, { username: email }],
    },
    populate: ['role'],
  })) as {
    id: number | string;
    email?: string | null;
    username?: string | null;
    provider?: string | null;
    confirmed?: boolean | null;
    blocked?: boolean | null;
    password?: string | null;
    role?: { id?: number | string | null } | null;
  } | null;

  if (!existing) {
    const createPayload: Record<string, unknown> = {
      username: email,
      email,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: roleId,
    };

    if (hasAdminPasswordHash) {
      createPayload.password = adminPasswordHash;
      await userQuery.create({ data: createPayload, populate: ['role'] });
    } else {
      createPayload.password = password;
      await usersPermissionsUserService.add(createPayload);
    }
    return;
  }

  const updatePayload: Record<string, unknown> = {};
  if (existing.email !== email) {
    updatePayload.email = email;
  }
  if (existing.username !== email) {
    updatePayload.username = email;
  }
  if (existing.provider !== 'local') {
    updatePayload.provider = 'local';
  }
  if (existing.confirmed !== true) {
    updatePayload.confirmed = true;
    updatePayload.confirmationToken = null;
  }
  if (existing.blocked === true) {
    updatePayload.blocked = false;
  }
  if ((existing.role?.id ?? null) !== roleId) {
    updatePayload.role = roleId;
  }

  if (hasAdminPasswordHash) {
    if (existing.password !== adminPasswordHash) {
      updatePayload.password = adminPasswordHash;
    }
  } else {
    const passwordHash = typeof existing.password === 'string' ? existing.password : '';
    const passwordMatches =
      passwordHash.length > 0
        ? await usersPermissionsUserService.validatePassword(password, passwordHash)
        : false;
    if (!passwordMatches) {
      updatePayload.password = password;
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    if (hasAdminPasswordHash) {
      await userQuery.update({
        where: { id: existing.id },
        data: updatePayload,
        populate: ['role'],
      });
      return;
    }

    await usersPermissionsUserService.edit(existing.id, updatePayload);
  }
}

export default async () => {
  if (!isSeedAdminAllowed()) {
    return;
  }

  const email = readNonEmpty(process.env.STRAPI_ADMIN_EMAIL, DEFAULT_ADMIN_EMAIL);
  const password = readNonEmpty(process.env.STRAPI_ADMIN_PASSWORD, DEFAULT_ADMIN_PASSWORD);
  const firstname = readNonEmpty(process.env.STRAPI_ADMIN_FIRSTNAME, DEFAULT_ADMIN_FIRSTNAME);
  const lastname = readNonEmpty(process.env.STRAPI_ADMIN_LASTNAME, DEFAULT_ADMIN_LASTNAME);

  const adminUserService = strapi.service('admin::user') as any;
  const adminRoleService = strapi.service('admin::role') as any;

  let superAdminRole = await adminRoleService.getSuperAdmin();
  if (!superAdminRole) {
    superAdminRole = await adminRoleService.create({
      name: 'Super Admin',
      code: SUPER_ADMIN_CODE,
      description: 'Super Admins can access and manage all features and settings.',
    });
    await adminRoleService.resetSuperAdminPermissions();
  }

  const existing = await adminUserService.findOneByEmail(email, ['roles']);
  if (existing) {
    const existingRoleIds = (existing.roles ?? []).map((role: any) => role.id);
    const nextRoleIds = existingRoleIds.includes(superAdminRole.id)
      ? existingRoleIds
      : [...existingRoleIds, superAdminRole.id];

    const updatePayload: Record<string, any> = {};
    if (!existing.isActive) {
      updatePayload.isActive = true;
    }
    if (nextRoleIds.length !== existingRoleIds.length) {
      updatePayload.roles = nextRoleIds;
    }
    if (!isPasswordHashed(existing.password)) {
      updatePayload.password = password;
    }

    if (Object.keys(updatePayload).length > 0) {
      await adminUserService.updateById(existing.id, updatePayload);
    }
    const adminPasswordHash = isPasswordHashed(existing.password) ? existing.password : null;
    await ensureUsersPermissionsAdminUser({ email, password, adminPasswordHash });
    return;
  }

  const createdAdminUser = await adminUserService.create({
    email,
    password,
    firstname,
    lastname,
    isActive: true,
    registrationToken: null,
    roles: [superAdminRole.id],
  });

  const adminPasswordHash = isPasswordHashed(createdAdminUser?.password)
    ? createdAdminUser.password
    : null;
  await ensureUsersPermissionsAdminUser({ email, password, adminPasswordHash });
};
