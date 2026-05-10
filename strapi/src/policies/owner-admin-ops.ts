import type { Core } from '@strapi/strapi';
import type { Context } from 'koa';

const USER_UID = 'plugin::users-permissions.user' as const;

interface PolicyContextState {
  readonly user?: {
    readonly id?: number | string;
  };
}

type PolicyContextWithMethods = Context & {
  readonly state?: PolicyContextState;
  unauthorized?: (message?: string) => Context;
  forbidden?: (message?: string) => Context;
};

interface UserRoleLike {
  readonly type?: unknown;
  readonly name?: unknown;
}

interface UserLike {
  readonly email?: unknown;
  readonly username?: unknown;
  readonly role?: UserRoleLike | null;
}

interface ResolvedRoleLike {
  readonly roleType: string | null;
  readonly roleName: string | null;
}

function normalizeString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function isOwnerOrAdminRole(roleType: string | null, roleName: string | null): boolean {
  return (
    roleType === 'admin' || roleType === 'owner' || roleName === 'admin' || roleName === 'owner'
  );
}

function shouldExposeForbiddenDetails(): boolean {
  const environment = (process.env.STRAPI_ENV || process.env.NODE_ENV || '').trim().toLowerCase();
  return environment !== 'production';
}

function formatResolvedRole(roleType: string | null, roleName: string | null): string {
  if (roleType && roleName && roleType !== roleName) {
    return `${roleName} (${roleType})`;
  }

  return roleName ?? roleType ?? 'none';
}

function buildForbiddenMessage(
  user: UserLike | null,
  roleType: string | null,
  roleName: string | null,
): string {
  const identity =
    normalizeString(user?.email, 160) ?? normalizeString(user?.username, 160) ?? 'unknown-user';
  const resolvedRole = formatResolvedRole(roleType, roleName);
  return `Owner/Admin required. Authenticated as ${identity} with role ${resolvedRole}.`;
}

async function resolveUserRole(
  strapi: Core.Strapi,
  userId: number | string,
): Promise<ResolvedRoleLike> {
  const userQuery = strapi.db.query(USER_UID as any);
  const user = (await userQuery.findOne({
    where: { id: userId },
    populate: ['role'],
  })) as UserLike | null;

  const hydratedRoleType = normalizeString(user?.role?.type, 80);
  const hydratedRoleName = normalizeString(user?.role?.name, 120);
  if (hydratedRoleType || hydratedRoleName) {
    return {
      roleType: hydratedRoleType,
      roleName: hydratedRoleName,
    };
  }

  const linkedRoles = await strapi.db
    .connection('up_users_role_lnk as userRoleLink')
    .leftJoin('up_roles as role', 'role.id', 'userRoleLink.role_id')
    .select({
      roleType: 'role.type',
      roleName: 'role.name',
    })
    .where('userRoleLink.user_id', userId);

  for (const linkedRole of linkedRoles as Array<{ roleType?: unknown; roleName?: unknown }>) {
    const roleType = normalizeString(linkedRole.roleType, 80);
    const roleName = normalizeString(linkedRole.roleName, 120);
    if (roleType || roleName) {
      return { roleType, roleName };
    }
  }

  return {
    roleType: null,
    roleName: null,
  };
}

export default async (
  policyContext: PolicyContextWithMethods,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi },
): Promise<boolean> => {
  const userId = policyContext.state?.user?.id;
  if (!userId) {
    if (typeof policyContext.unauthorized === 'function') {
      policyContext.unauthorized('owner.ops.unauthorized');
    }
    return false;
  }

  const userQuery = strapi.db.query(USER_UID as any);
  const user = (await userQuery.findOne({
    where: { id: userId },
  })) as UserLike | null;

  if (!user) {
    if (typeof policyContext.unauthorized === 'function') {
      policyContext.unauthorized('owner.ops.unauthorized');
    }
    return false;
  }

  const { roleType, roleName } = await resolveUserRole(strapi, userId);
  if (isOwnerOrAdminRole(roleType, roleName)) {
    return true;
  }

  if (typeof policyContext.forbidden === 'function') {
    policyContext.forbidden(
      shouldExposeForbiddenDetails()
        ? buildForbiddenMessage(user, roleType, roleName)
        : 'owner.ops.forbidden',
    );
  }
  return false;
};
