# Note-Taking App

A cross-platform note-taking application built with React Native and Expo.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Language | TypeScript |
| Navigation | React Navigation |
| State Management | Zustand |
| Backend | Firebase (Firestore, Auth, Storage) |
| CI/CD | GitHub Actions + Expo EAS |

## Features

- Create, read, update, delete notes
- AI-powered note summarization (Anthropic Claude API)
- Offline support with local storage
- Dark mode
- Markdown editor
- Tag-based search
- User authentication

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
npm install --legacy-peer-deps
```

### Run the app

```bash
# Web
npm run web

# Android
npm run android

# iOS
npm run ios
```

### Run tests

```bash
npm test
```

### Run linting

```bash
npm run lint
```

## Project Structure

```
note-taking-app/
├── app/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen-level components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Firebase, API calls
│   ├── store/          # Zustand state stores
│   ├── types/          # TypeScript types
│   └── utils/          # Helper functions
├── assets/             # Images, fonts
├── .github/
│   └── workflows/      # GitHub Actions CI/CD
└── docs/               # Documentation
```

## CI/CD Pipeline

Every pull request to `main` triggers:
1. **Lint** — ESLint checks
2. **Type Check** — TypeScript compilation check
3. **Tests** — Jest unit tests with coverage report

PRs must pass all checks before merging.

## License

MIT
