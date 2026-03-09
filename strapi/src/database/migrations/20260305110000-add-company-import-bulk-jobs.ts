import type { Knex } from 'knex';

const JOBS_TABLE = 'company_import_jobs';
const ERRORS_TABLE = 'company_import_job_errors';

export async function up(knex: Knex): Promise<void> {
  const hasJobsTable = await knex.schema.hasTable(JOBS_TABLE);
  if (!hasJobsTable) {
    await knex.schema.createTable(JOBS_TABLE, (table) => {
      table.string('id', 64).primary();
      table.string('user_id', 64).notNullable();
      table.string('mode', 24).notNullable();
      table.boolean('dry_run').notNullable().defaultTo(false);
      table.string('source_type', 24).notNullable();
      table.text('source_path').nullable();
      table.text('payload_json').nullable();
      table.string('payload_hash', 128).notNullable();
      table.string('idempotency_key', 160).nullable();
      table.string('state', 24).notNullable().defaultTo('queued');
      table.string('phase', 48).notNullable().defaultTo('upload/store');
      table.integer('total_count').notNullable().defaultTo(0);
      table.integer('processed_count').notNullable().defaultTo(0);
      table.integer('ok_count').notNullable().defaultTo(0);
      table.integer('failed_count').notNullable().defaultTo(0);
      table.integer('warnings_count').notNullable().defaultTo(0);
      table.integer('created_count').notNullable().defaultTo(0);
      table.integer('updated_count').notNullable().defaultTo(0);
      table.integer('skipped_count').notNullable().defaultTo(0);
      table.text('report_json').nullable();
      table.text('last_error').nullable();
      table.datetime('started_at').nullable();
      table.datetime('completed_at').nullable();
      table.datetime('cancel_requested_at').nullable();
      table.datetime('created_at').notNullable();
      table.datetime('updated_at').notNullable();
      table.unique(['user_id', 'idempotency_key', 'payload_hash'], {
        indexName: 'company_import_jobs_idempotency_unique',
      });
      table.index(['state', 'created_at'], 'company_import_jobs_state_idx');
    });
  }

  const hasErrorsTable = await knex.schema.hasTable(ERRORS_TABLE);
  if (!hasErrorsTable) {
    await knex.schema.createTable(ERRORS_TABLE, (table) => {
      table.increments('id').primary();
      table.string('job_id', 64).notNullable().references('id').inTable(JOBS_TABLE).onDelete('CASCADE');
      table.integer('row_number').notNullable();
      table.string('field', 96).nullable();
      table.string('code', 96).notNullable();
      table.text('message').notNullable();
      table.text('raw_sample').nullable();
      table.datetime('created_at').notNullable();
      table.index(['job_id', 'id'], 'company_import_job_errors_job_idx');
      table.index(['job_id', 'row_number'], 'company_import_job_errors_row_idx');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable(ERRORS_TABLE)) {
    await knex.schema.dropTable(ERRORS_TABLE);
  }
  if (await knex.schema.hasTable(JOBS_TABLE)) {
    await knex.schema.dropTable(JOBS_TABLE);
  }
}
