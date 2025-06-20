# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm run lint` - Run ESLint
- `pnpm run dkgen --name migration_name` - Create a drizzle migration

## Architecture Overview

This is a full-stack quiz application that generates BuzzFeed-style quizzes from web content using AI.

**Tech Stack:**
- Backend: Express.js with TypeScript, served via ViteExpress
- Frontend: React with TypeScript, built with Vite
- Database: PostgreSQL with Drizzle ORM
- AI: Anthropic Claude API for quiz generation
- Web scraping: Exa API for content extraction

**Core Flow:**
1. User provides a URL → Exa scrapes content → stores in `webpage` table
2. Claude API generates 10-question quiz → stores in `quiz` table with foreign key to webpage
3. Frontend displays quiz with source attribution and editing capabilities

**Key Files:**
- `src/server.ts` - Main Express server with API routes
- `src/anthropic-api.ts` - Quiz generation and editing logic using Claude
- `src/db/schema.ts` - Database schema definitions (webpage, quiz tables)
- `src/shared/api-types.ts` - Shared TypeScript interfaces for API
- `src/frontend/` - React components (Home, Quiz, App)

**Database Schema:**
- `webpage` table: stores scraped content (url, title, text, favicon)
- `quiz` table: stores generated quizzes with items array and deletedItems for editing

**API Endpoints:**
- `GET /api/quiz/:quizId` - Fetch single quiz with source info
- `GET /api/quizzes` - Fetch all quizzes ordered by creation time
- `POST /api/create_quiz` - Generate new quiz from URL
- `POST /api/edit_quiz` - Edit existing quiz (delete items, add new ones)

## Development Notes

- Uses pnpm for package management
- TypeScript strict mode enabled
- Drizzle ORM with snake_case casing convention
- Quiz editing maintains exactly 10 questions by generating replacements
- Frontend uses React Router for navigation
- ViteExpress serves both API and frontend in development

## Important ESLint rules

```
{
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'semi': ['error', 'never'],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
}
```

## Other principles

- Backend code should never import from the src/frontend folder
- Frontend code should only import the src/frontend and src/shared folders (as well as third-party libs)
- Any code imported by both frontend and backend should be placed in the src/shared folder. Code inside this folder should not import anything from outside this folder (except third-party libs)
- For every route, define the response type in src/shared/api-types.ts, and use 'as' notation to specify the type that is returned from the route via res.json(). These types should also be explicitly used in the frontend. Don't create a new response type if the a suitable one already exists, just rename it to be more encompassing
- For every POST route, additionally specify the request type in src/shared/api-types.ts, and use 'as' notation to specify the type of req.body. These types should also be explicitly used in the frontend.
- Update the "Architecture Overview" in CLAUDE.md whenever anything relevant changes, to keep it up to date
- Only create drizzle migrations, don't actually run them (let the user do that separately).
- Don't add any trailing spaces, or any spaces on empty lines
