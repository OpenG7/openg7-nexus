import { getSeedFailureStrategy } from '../utils/seed-helpers';

type SeedRunner = () => Promise<void>;

interface SeedDefinition {
  name: string;
  run: SeedRunner | undefined;
}

const seeds: SeedDefinition[] = [
  { name: '00-locales', run: require('./00-locales').default },
  { name: '01-roles-permissions', run: require('./01-roles-permissions').default },
  { name: '02-admin-user', run: require('./02-admin-user').default },
  { name: '03-taxonomies', run: require('./03-taxonomies').default },
  { name: '04-homepage', run: require('./04-homepage').default },
  { name: '05-companies', run: require('./05-companies').default },
  { name: '06-exchanges', run: require('./06-exchanges').default },
  { name: '07-feature-flags', run: require('./07-feature-flags').default },
  { name: '08-api-tokens', run: require('./08-api-tokens').default },
  { name: '09-national-projects', run: require('./09-national-projects').default },
  { name: '10-company-permissions', run: require('./10-company-permissions').default },
  { name: '11-statistic-insights', run: require('./11-statistic-insights').default },
  { name: '12-company-countries', run: require('./12-company-countries').default },
  { name: '13-auth-settings', run: require('./13-auth-settings').default },
  { name: '14-importation', run: require('./14-importation').default },
  { name: '15-hydrocarbon-signals', run: require('./15-hydrocarbon-signals').default },
];

export default async function runSeeds() {
  const failedSeeds: { name: string; message: string }[] = [];
  const failureStrategy = getSeedFailureStrategy();

  for (const seed of seeds) {
    if (typeof seed.run !== 'function') {
      strapi.log?.warn?.(`Seed "${seed.name}" is not executable. Skipping.`);
      continue;
    }

    try {
       
      await seed.run();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      strapi.log?.error?.(`Seed "${seed.name}" failed: ${message}`);
      strapi.log?.debug?.(error);
      failedSeeds.push({ name: seed.name, message });

      if (failureStrategy === 'fail-fast') {
        throw new Error(`Seed "${seed.name}" failed with fail-fast strategy: ${message}`);
      }
    }
  }

  if (failedSeeds.length > 0) {
    const summary = failedSeeds.map(({ name, message }) => `- ${name}: ${message}`).join('\n');
    strapi.log?.error?.(`One or more seeds failed while continuing execution:\n${summary}`);
  }
}
