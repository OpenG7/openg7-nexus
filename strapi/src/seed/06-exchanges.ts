import { ensureLocale, findId, upsertByUID } from '../utils/seed-helpers';

interface ExchangeSeed {
  sourceProvinceSlug: string;
  targetProvinceSlug: string;
  value: number;
  unit: string;
}

const exchanges: ExchangeSeed[] = [
  { sourceProvinceSlug: 'bc', targetProvinceSlug: 'ab', value: 1250, unit: 'GWh' },
  { sourceProvinceSlug: 'sk', targetProvinceSlug: 'on', value: 3200, unit: 'tonnes' },
  { sourceProvinceSlug: 'ns', targetProvinceSlug: 'qc', value: 18.5, unit: 'ships/month' },
];

export default async () => {
  await ensureLocale('fr');
  await ensureLocale('en');

  for (const exchange of exchanges) {
    const sourceId = await findId('api::province.province', { slug: exchange.sourceProvinceSlug });
    const targetId = await findId('api::province.province', { slug: exchange.targetProvinceSlug });

    if (!sourceId || !targetId) continue;

    await upsertByUID(
      'api::exchange.exchange',
      {
        sourceProvince: sourceId,
        targetProvince: targetId,
        value: exchange.value,
        unit: exchange.unit,
      },
      {
        unique: {
          sourceProvince: { id: sourceId },
          targetProvince: { id: targetId },
        },
      },
    );
  }
};
