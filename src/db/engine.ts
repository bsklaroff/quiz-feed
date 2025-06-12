import { drizzle } from 'drizzle-orm/node-postgres'

const db = drizzle({
  connection: process.env.QF_DB_URL!,
  casing: 'snake_case',
})

export type DBType = typeof db
export type TXType = Parameters<Parameters<DBType['transaction']>[0]>[0]

export default db

