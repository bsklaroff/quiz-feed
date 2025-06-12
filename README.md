## Getting Started

Install dependencies with pnpm:
```
brew install pnpm
pnpm install
```

Ensure you have `QF_DB_URL`, `QF_ANTHROPIC_API_KEY`, and `QF_EXA_API_KEY` set. Then, run the dev server (uses hot module reloading):
```
pnpm run dev
```

To run the production server, first build the `src/dist/` folder, then run the server:
```
pnpm run build
pnpm run prod
```

## Setting Up Local DB

Install and start postgres 16, then create express-vite DB:
```
brew install postgresql@16
brew services start postgresql@16
createdb quiz-feed

# probably also add the following to your ~/.bashrc
export QF_DB_URL='postgresql://localhost:5432/quiz-feed'
```

Run drizzle-kit migrations (`QF_DB_URL` env var must be set):
```
pnpm run dkmig
```

If you change `db/schema.ts`, you can use drizzle-kit to automatically generate and run corresponding migrations:
```
pnpm run dkgen
pnpm run dkmig
```
