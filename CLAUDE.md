# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (always use --legacy-peer-deps)
npm install --legacy-peer-deps

# Run development server
npm run web        # Web (recommended for development)
npm run android    # Android
npm run ios        # iOS

# Quality checks
npm test           # Run Jest tests
npm run lint       # ESLint
npm run type-check # TypeScript type check

# CI equivalents (stricter, used in GitHub Actions)
npm run test:ci    # Tests with coverage
npm run lint:ci    # Lint with zero warnings allowed
```

Tests live in `app/screens/__tests__/` and use `jest-expo` preset with `@testing-library/react-native`.

## Architecture

**App.tsx** is the root — it manages a simple screen state machine (`login | register | home | editor`) with animated transitions. Navigation is prop-drilled callbacks; there is no React Navigation router in use despite the package being installed.

**Data flow:**
- Firebase Firestore is the source of truth. `noteService.ts` uses `onSnapshot` for real-time subscription, which feeds `useNoteStore` (Zustand). The store holds `notes[]` and `searchQuery`, with a derived `filteredNotes()` selector.
- Auth state from Firebase Auth is observed in `App.tsx` via `onAuthStateChanged`, which drives screen transitions.

**Key services (`app/services/`):**
- `firebase.ts` — Firebase app init; exports `auth` and `db`
- `authService.ts` — Firebase Auth wrappers (login, register, logout)
- `noteService.ts` — Firestore CRUD + real-time subscription; notes are ordered by `isPinned desc`, `updatedAt desc` (requires a composite index — see `firestore.indexes.json`)
- `geminiService.ts` — Groq API client (despite the filename, uses Groq, not Gemini); provides `generateTitle`, `generateTags`, `generateSummary`

**AI features** require `EXPO_PUBLIC_GROQ_API_KEY` in `.env`. The service calls `https://api.groq.com/openai/v1/chat/completions` with model `llama-3.1-8b-instant`.

**Mocks (`__mocks__/`):** Jest module name mappings in `package.json` redirect `firebase/*`, `@firebase/*`, `../services/authService`, and `@expo/vector-icons` to manual mocks in this directory.

## Environment

Create `.env` at project root:
```
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

Firebase config is hardcoded in `app/services/firebase.ts` (intentional for this project).
