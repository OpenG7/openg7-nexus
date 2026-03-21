import { upsertByUID } from '../utils/seed-helpers';

const watchlists = [
  {
    name: 'Batteries USMCA',
    owner: 'Equipe appro Ontario',
    filters: {
      periodGranularity: 'month',
      periodValue: '2026-03',
      originScope: 'usmca',
      originCodes: [],
      hsSections: ['85'],
      compareMode: false,
      compareWith: null,
    },
    source: 'seed',
  },
  {
    name: 'Intrants pharma G7',
    owner: 'Cellule resilience QC',
    filters: {
      periodGranularity: 'quarter',
      periodValue: '2026-Q1',
      originScope: 'g7',
      originCodes: [],
      hsSections: ['29'],
      compareMode: true,
      compareWith: '2025-Q1',
    },
    source: 'seed',
  },
] as const;

const annotations = [
  {
    author: 'Equipe veille Ontario',
    excerpt: 'La demande batterie reste plus forte que prevu sur le corridor Detroit Windsor.',
    relatedCommodityId: 'battery-cells',
    relatedOriginCode: 'US',
    source: 'seed',
  },
  {
    author: 'Pole conformite import',
    excerpt: 'Les controles d origine preferentielle ont ete renforces pour plusieurs lots techniques.',
    relatedCommodityId: 'rare-earth-magnets',
    relatedOriginCode: 'DE',
    source: 'seed',
  },
] as const;

const reportSchedules = [
  {
    period: 'month',
    recipients: ['ops@example.test'],
    format: 'csv',
    frequency: 'monthly',
    notes: 'Weekly import resilience digest',
    status: 'scheduled',
  },
] as const;

export default async () => {
  for (const watchlist of watchlists) {
    await upsertByUID('api::import-watchlist.import-watchlist', watchlist, {
      unique: {
        name: watchlist.name,
        owner: watchlist.owner,
      },
    });
  }

  for (const annotation of annotations) {
    await upsertByUID('api::import-annotation.import-annotation', annotation, {
      unique: {
        author: annotation.author,
        excerpt: annotation.excerpt,
      },
    });
  }

  for (const report of reportSchedules) {
    await upsertByUID('api::import-report-schedule.import-report-schedule', report, {
      unique: {
        notes: report.notes,
      },
    });
  }
};