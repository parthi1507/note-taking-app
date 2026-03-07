# NoteApp

A cross-platform note-taking application built with React Native and Expo. Works on web, Android, iOS, and desktop browsers.

## Features

- **Notes CRUD** — Create, edit, delete notes with real-time Firestore sync
- **AI-Powered Tools** — Auto-generate title, tags, and summary using Groq AI (llama-3.1-8b-instant)
- **Voice to Text** — Speak to type using the Web Speech API (Chrome/Edge)
- **Note Templates** — One-tap starters: Meeting Notes, To-Do List, Journal, Lecture Notes
- **Markdown Editor** — Write with H1/H2/H3, bold, italic, code, bullets, checkboxes, dividers
- **Markdown Preview** — Toggle between edit and rendered preview
- **Tag System** — Add up to 5 tags per note, filter by search
- **Color Coding** — 6 color themes per note
- **Pin Notes** — Pinned notes always appear at the top
- **Search** — Real-time search across title, content, and tags
- **User Auth** — Email/password sign-up and login via Firebase Auth
- **Responsive UI** — Optimized for mobile, tablet, desktop, and TV screen sizes
- **Dark Theme** — Dark glassmorphism design throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (TypeScript) |
| Backend | Firebase Firestore + Firebase Auth |
| AI | Groq API (llama-3.1-8b-instant) |
| State Management | Zustand |
| Voice Input | Web Speech API |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/parthiban-countai/note-taking-app.git
cd note-taking-app
npm install --legacy-peer-deps
```

### Environment Variables

Create a `.env` file in the root directory:

```
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

> Firebase config is already embedded in `app/services/firebase.ts` for this project.

### Run the App

```bash
# Web
npm run web

# Android
npm run android

# iOS
npm run ios
```

### Run Tests

```bash
npm test
```

### Run Linting

```bash
npm run lint
```

### Type Check

```bash
npm run type-check
```

## Project Structure

```
note-taking-app/
├── app/
│   ├── components/         # Reusable UI components
│   │   ├── EmptyState.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── NoteCard.tsx
│   │   └── TemplatePickerModal.tsx
│   ├── data/
│   │   └── templates.ts    # Note template definitions
│   ├── hooks/              # Custom React hooks
│   │   ├── useResponsive.ts
│   │   └── useVoiceInput.ts
│   ├── screens/            # Screen-level components
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── NoteEditorScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── services/           # Firebase and API services
│   │   ├── authService.ts
│   │   ├── firebase.ts
│   │   ├── geminiService.ts
│   │   └── noteService.ts
│   ├── store/              # Zustand state stores
│   │   └── noteStore.ts
│   ├── types/              # TypeScript type definitions
│   │   └── note.ts
│   └── utils/              # Helper functions
│       └── validation.ts
├── __mocks__/              # Jest mocks for Firebase and icons
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI pipeline
├── public/
│   └── index.html          # Web full-viewport fix
├── App.tsx                 # Root app with screen state machine
└── firestore.indexes.json  # Firestore composite index config
```

## CI/CD Pipeline

Every pull request to `main` triggers 3 automated checks:

1. **Lint** — ESLint code quality checks
2. **Type Check** — TypeScript compilation validation
3. **Tests** — Jest unit tests

All checks must pass before a PR can be merged.

## License

MIT
