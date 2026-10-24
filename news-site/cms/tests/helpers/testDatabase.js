import { rmSync } from 'node:fs'

import pg from 'pg'

/**
 * Gives a test file its own empty database and points DATABASE_URL at it, so
 * files never share data.
 *
 * - Default: a throwaway SQLite file in the CMS folder (fast, no setup).
 * - With TEST_DATABASE_URL set to a Postgres address (any database on that
 *   server, with permission to create databases): a fresh Postgres database
 *   named cms_test_<name>. CI's "Test on Postgres (cms)" job does this, and you
 *   can too: set TEST_DATABASE_URL and run plain `npm test` (there is no
 *   separate script). The same tests then run on the database that production
 *   uses.
 *
 * @param {string} name short name of the test file, letters, digits, dashes
 * @returns {Promise<'postgres' | 'sqlite'>} which database the file will use
 */
export async function useTestDatabase(name) {
  const admin = process.env.TEST_DATABASE_URL

  if (admin && /^postgres(ql)?:\/\//i.test(admin)) {
    const database = `cms_test_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
    const client = new pg.Client({ connectionString: admin })
    await client.connect()
    try {
      await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
      await client.query(`CREATE DATABASE "${database}"`)
    } finally {
      await client.end()
    }
    const url = new URL(admin)
    url.pathname = `/${database}`
    process.env.DATABASE_URL = url.toString()
    return 'postgres'
  }

  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`./cms-${name}-test.db${suffix}`, { force: true })
  }
  process.env.DATABASE_URL = `file:./cms-${name}-test.db`
  return 'sqlite'
}
