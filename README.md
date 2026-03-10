# Notyx

![CI](https://github.com/parthi1507/note-taking-app/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20Web-lightgrey)
![Expo](https://img.shields.io/badge/expo-55-black)

A modern, cross-platform note-taking application built with React Native and Expo. Runs on Android, iOS, and Web from a single codebase.

---

## Features

- **Notes CRUD** — Create, edit, and delete notes with real-time Firestore sync
- **Rich Text Editor** — WYSIWYG editor on web; formatting toolbar (Bold, Italic, Underline, Strikethrough, H1, H2) available on both web and mobile
- **AI Chat with Notes** — Ask questions about your notes in a chat interface; AI answers using only your notes and shows which notes it used as sources (works in both Personal and Team workspace context)
- **AI-Powered Tools** — Auto-generate title, tags, and summary using Groq AI (`llama-3.1-8b-instant`)
- **PDF Import + AI** — Pick any PDF on web or mobile; text is extracted and sent to AI to auto-generate a structured note with title, content, and tags
- **Voice to Text** — Record audio and transcribe it into note content using Groq Whisper API
- **Audio File Upload** — Upload audio files up to any size; files over 24 MB are auto-chunked and transcribed in parts
- **Business Card Scan** — Photograph or upload a business card; contact details are extracted via Groq Vision AI and inserted into the note
- **Smart Reminders** — Set reminders on any note with quick presets (1h, 3h, Tomorrow 9am, Next week) or a custom date/time picker; mobile users receive native OS push notifications, web users see in-app badges; reminders are categorized as Upcoming, Overdue, and Completed with personal/team source badges
- **Team Workspaces** — Create shared workspaces where team members can view and edit notes together; workspace creator generates a time-limited invite code (valid 2m 30s) that others use to join
- **Note Templates** — One-tap starters: Meeting Notes, To-Do List, Journal, Lecture Notes
- **Inline Location** — Insert location chips at cursor position via GPS or search (powered by Nominatim / OpenStreetMap)
- **URL Auto-Linkify** — URLs typed in notes are automatically converted to clickable links
- **Tag System** — Add tags per note, filter by real-time search
- **Color Coding** — 6 color themes per note with live modal color reflection
- **Pin Notes** — Pinned notes always appear at the top
- **Search** — Real-time search across title, content, and tags
- **Modal Card Editor** — Notes open as a responsive modal (slide-up sheet on mobile, centered card on desktop)
- **User Auth** — Email/password sign-up and login via Firebase Auth with persistent session (stays logged in across app restarts)
- **Forgot Password** — Send a password reset email; web users reset via in-app redirect link with a password strength indicator; native users reset via Firebase email link
- **Responsive UI** — Optimized for mobile, tablet, and desktop screen sizes
- **Dark Theme** — Dark glassmorphism design throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 55 (TypeScript) |
| Backend | Firebase Firestore + Firebase Auth |
| AI (Text) | Groq API — `llama-3.1-8b-instant` |
| AI (Voice) | Groq Whisper API — `whisper-large-v3-turbo` |
| AI (Vision) | Groq Vision API — `meta-llama/llama-4-scout-17b-16e-instruct` (business card scan) |
| PDF Parsing (Web) | pdf.js 3.11.174 loaded from CDN |
| PDF Parsing (Mobile) | Custom binary BT/ET stream parser (no native dependency) |
| Push Notifications | expo-notifications (mobile native OS notifications) |
| Location | Nominatim / OpenStreetMap (free, no API key) |
| Auth Persistence | AsyncStorage (`@react-native-async-storage/async-storage`) |
| State Management | Zustand |
| Navigation | Prop-drilled screen state machine (no React Navigation router) |
| Build | EAS Build (Expo Application Services) |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo account (for EAS builds) — [expo.dev](https://expo.dev)

### Installation

```bash
git clone https://github.com/parthi1507/note-taking-app.git
cd note-taking-app
npm install --legacy-peer-deps
```

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).
Get Firebase config from your [Firebase Console](https://console.firebase.google.com) project settings.

---

## Running the App

```bash
# Web (recommended for development)
npm run web

# Android
npm run android

# iOS
npm run ios
```

---

## Building an APK (Android)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build -p android --profile preview
```

Download the APK from the link provided after the build completes.

---

## Quality Checks

```bash
# Run tests
npm test

# Run tests with coverage (CI mode)
npm run test:ci

# Lint
npm run lint

# TypeScript type check
npm run type-check
```

---

## Project Structure

```
note-taking-app/
├── app/
│   ├── components/             # Reusable UI components
│   │   ├── EmptyState.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── NoteCard.tsx
│   │   ├── RichTextEditor.tsx  # WYSIWYG editor (web) + formatting toolbar (mobile)
│   │   ├── SkeletonCard.tsx
│   │   └── TemplatePickerModal.tsx
│   ├── data/
│   │   └── templates.ts        # Note template definitions
│   ├── screens/                # Screen-level components
│   │   ├── AIChatScreen.tsx    # AI chat interface — ask questions about your notes
│   │   ├── ForgotPasswordScreen.tsx  # Email input → password reset email flow
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── NoteEditorScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── RemindersScreen.tsx       # Upcoming / Overdue / Completed reminders list
│   │   └── ResetPasswordScreen.tsx   # In-app password reset (web redirect flow)
│   ├── services/               # Firebase and API services
│   │   ├── authService.ts      # Auth wrappers + forgot/reset password
│   │   ├── firebase.ts
│   │   ├── groqService.ts      # Groq AI (text + Whisper voice + Vision + PDF structuring)
│   │   ├── locationService.ts  # GPS + Nominatim reverse geocoding & search
│   │   ├── noteService.ts
│   │   ├── pdfService.ts       # PDF pick + cross-platform text extraction
│   │   ├── reminderService.ts  # Firestore reminders + expo-notifications scheduling
│   │   └── workspaceService.ts # Team workspace CRUD + timed invite code generation
│   ├── hooks/                  # Custom React hooks
│   │   ├── useResponsive.ts    # Breakpoint-aware layout values
│   │   └── useVoiceInput.ts
│   ├── store/                  # Zustand state stores
│   │   ├── noteStore.ts
│   │   └── workspaceStore.ts   # Active workspace, workspace notes, search state
│   ├── types/                  # TypeScript type definitions
│   │   ├── note.ts
│   │   ├── reminder.ts         # Reminder interface (personal/team, scheduledTime, isDone)
│   │   └── workspace.ts        # Workspace interface with timed invite code fields
│   ├── utils/                  # Shared utilities
│   │   └── validation.ts
│   └── screens/__tests__/      # Jest unit tests
├── __mocks__/                  # Jest mocks for Firebase, icons, and AsyncStorage
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── App.tsx                     # Root — screen state machine + modal overlay
├── app.json                    # Expo app configuration
├── eas.json                    # EAS Build configuration
└── firestore.indexes.json      # Firestore composite index config
```

---

## CI/CD Pipeline

Every pull request and push to `main` triggers automated checks via GitHub Actions:

1. **Lint** — ESLint code quality checks (zero warnings allowed)
2. **Type Check** — TypeScript compilation validation
3. **Tests** — Jest unit tests with coverage report

All checks must pass before a PR can be merged.

---

## License

MIT
