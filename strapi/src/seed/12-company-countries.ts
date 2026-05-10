export default async () => {
  const companies = await strapi.entityService.findMany('api::company.company', {
    fields: ['id', 'country'],
    limit: 200,
  });

  if (!Array.isArray(companies)) {
    return;
  }

  for (const entry of companies) {
    const id = typeof entry?.id === 'number' ? entry.id : null;
    if (!id) {
      continue;
    }
    const hasCountry =
      typeof (entry as any).country === 'string' && (entry as any).country.trim() !== '';
    if (hasCountry) {
      continue;
    }

    await strapi.entityService.update('api::company.company', id, {
      data: { country: 'CA' } as any,
    });
  }
};
