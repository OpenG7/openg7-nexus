import { compileStrapi, createStrapi } from '@strapi/strapi';

import seedAdminQualityMatrix from '../src/seed/16-admin-quality-matrix';

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  try {
    console.log('Syncing admin-quality-matrix.json → Strapi…');
    await seedAdminQualityMatrix();
    console.log('Sync complete.');
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
