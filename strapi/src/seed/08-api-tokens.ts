export default async () => {
  const token = process.env.STRAPI_API_READONLY_TOKEN?.trim();
  if (!token) {
    strapi.log?.warn?.(
      '[seeds] Missing STRAPI_API_READONLY_TOKEN. Skipping read-only token provisioning.',
    );
    return;
  }

  const apiTokenService = strapi.service('admin::api-token');
  const existing = await apiTokenService.findMany({ filters: { name: 'frontend-readonly' } });
  const tokenEntry = Array.isArray(existing) ? existing[0] : existing;

  if (!tokenEntry) {
    await apiTokenService.create({
      name: 'frontend-readonly',
      description: 'Read-only token for the public web client',
      type: 'read-only',
      accessKey: token,
    });
    strapi.log?.info?.('[seeds] Created frontend-readonly API token.');
    return;
  }

  if (tokenEntry.accessKey !== token) {
    await apiTokenService.update(tokenEntry.id, {
      name: 'frontend-readonly',
      description: 'Read-only token for the public web client',
      type: 'read-only',
      accessKey: token,
    });
    strapi.log?.info?.(
      '[seeds] Updated frontend-readonly API token to match STRAPI_API_READONLY_TOKEN.',
    );
  }
};
