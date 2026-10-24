import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'

/**
 * Which database the CMS uses is decided by DATABASE_URL:
 *
 * - `postgres://` or `postgresql://`: Postgres. Staging, production and CI.
 *   Tables come only from committed migration files in production
 *   (AGENTS.md S18); outside production Payload may create them itself.
 * - anything else (or unset): a local SQLite file for quick developer runs and
 *   tests. Never used in production.
 */
const url = process.env.DATABASE_URL

export const usesPostgres = Boolean(url && /^postgres(ql)?:\/\//i.test(url))

export function databaseAdapter() {
  if (usesPostgres) {
    return postgresAdapter({
      pool: { connectionString: url },
    })
  }
  return sqliteAdapter({
    client: { url: url || 'file:./cms-trial.db' },
  })
}
