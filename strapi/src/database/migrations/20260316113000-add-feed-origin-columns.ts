import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('feed_items', 'origin_type'))) {
    await knex.schema.alterTable('feed_items', (table) => {
      table.string('origin_type', 32).nullable();
    });
  }

  if (!(await knex.schema.hasColumn('feed_items', 'origin_id'))) {
    await knex.schema.alterTable('feed_items', (table) => {
      table.string('origin_id', 120).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn('feed_items', 'origin_id')) {
    await knex.schema.alterTable('feed_items', (table) => {
      table.dropColumn('origin_id');
    });
  }

  if (await knex.schema.hasColumn('feed_items', 'origin_type')) {
    await knex.schema.alterTable('feed_items', (table) => {
      table.dropColumn('origin_type');
    });
  }
}
