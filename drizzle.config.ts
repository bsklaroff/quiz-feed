import { defineConfig } from 'drizzle-kit'

const dbUrl = process.env.QF_DB_URL!.includes('localhost')
  ? process.env.QF_DB_URL!
  : process.env.QF_DB_URL! + '?sslmode=no-verify'

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: dbUrl,
  },
  migrations: {
    schema: 'public',
  },
})
