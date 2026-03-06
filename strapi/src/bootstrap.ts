import runSeeds from './seed';
import { getSeedFailureStrategy, isAutoSeedEnabled, isDevOrIntegrationEnv } from './utils/seed-helpers';
import { ensureCompanyImportBulkWorkerRunning } from './api/company-import/services/company-import-bulk-jobs';

export default async ({ strapi }: { strapi: any }) => {
  ensureCompanyImportBulkWorkerRunning(strapi);

  const shouldSeed = isDevOrIntegrationEnv() && isAutoSeedEnabled();

  if (!shouldSeed) {
    strapi.log?.info?.('Skipping seed execution (environment or flags not enabled).');
    return;
  }

  const failureStrategy = getSeedFailureStrategy();
  strapi.log?.info?.(`Running Strapi seeds for development environment (failure strategy: ${failureStrategy}).`);
  await runSeeds();
};
