# FinManager — Personal Finance Management Application

A cross-platform personal finance management application built with React Native, Expo, and Firebase. Developed as part of the SEC 6201 Undergraduate Project at the University of Bolton — Ras Al Khaimah Academic Centre.

## Live Demo & Downloads

- **Web App:** [fin-manager-00000.netlify.app](https://fin-manager-00000.netlify.app/)
- **Android APK:** [Download from Expo](https://expo.dev/accounts/wew788/projects/finmanager/builds/f87c5dc5-927c-449b-94fc-621bba1830e8)
- **iOS:** Available via Expo Go (scan QR code from `npx expo start`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo SDK 54 |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Backend/Auth | Firebase Authentication (Email/Password) |
| Database | Cloud Firestore |
| Offline Storage | AsyncStorage |
| Charts | react-native-svg |
| Icons | @expo/vector-icons (Feather) |
| CSV Parsing | papaparse |
| PDF Export | expo-print + expo-sharing |
| Deployment | Netlify (Web), EAS Build (Android) |

## Features

### Core Functionality
- **User Authentication** — Email/password registration and login with Firebase Auth, persistent sessions across app restarts
- **User Profiles** — Name, country, and currency selection during signup with 39 supported countries
- **Transaction Management** — Add, edit, and delete income/expense transactions with category, account, date, and notes
- **Multiple Accounts** — Cash, Bank, Credit Card, Savings, E-Wallet account types with balance tracking
- **Credit Card Tracking** — Credit limits, available credit, and usage monitoring
- **Account Transfers** — Transfer funds between accounts with optional fees
- **Balance Validation** — Prevents spending beyond available balance or credit limit

### Budgeting & Goals
- **Budget Management** — Create weekly, monthly, yearly, or custom period budgets per category
- **Budget Alerts** — Configurable threshold notifications when spending approaches budget limit (web notifications supported)
- **Savings Goals** — Set target amounts and dates, add/withdraw funds, track progress with visual indicators

### Reports & Analytics
- **Dashboard** — Summary cards, donut pie chart (spending by category), bar chart (6-month trends), account balances, recent transactions
- **Reports Screen** — Monthly/yearly toggle, period navigation, income and expense donut charts, daily spending bars, top expenses list
- **Export PDF** — Generates formatted PDF reports on mobile via expo-print, print dialog on web
- **Export CSV** — Downloads .csv file on web, redirects to web app on mobile

### User Experience
- **Dark/Light/System Theme** — Full dark mode support across all screens
- **Custom Categories** — Emoji picker for category icons, 29 default categories
- **Transaction Filtering** — Filter by type, category, account, amount range, date range; hide transfers/adjustments
- **Transaction Sorting** — 6 sorting options (date, amount, category — ascending/descending)
- **Offline Support** — Save transactions locally when offline, auto-sync when connection restored
- **Multi-Currency** — Currency symbol displayed based on user's country selection
- **Tutorial System** — 7-step walkthrough for new users
- **Responsive Layout** — Adapts to phone, tablet, and desktop screen sizes

## Project Structure

```
FinManager/
├── App.js                          # Root component, navigation, providers
├── app.json                        # Expo configuration
├── eas.json                        # EAS Build configuration
├── postbuild.js                    # Copies font files for web deployment
├── public/
│   └── index.html                  # Custom web template with font loading
├── config/
│   └── firebase.js                 # Firebase init with platform-specific auth persistence
├── context/
│   ├── ThemeContext.js              # Dark/light/system theme provider
│   ├── UserContext.js               # User profile, currency, formatAmount
│   └── accessibility.js            # WCAG accessibility helpers
├── services/
│   ├── firestoreService.js         # Firestore CRUD operations
│   ├── localDatabase.js            # AsyncStorage offline queue
│   ├── syncService.js              # Auto-sync pending transactions
│   ├── budgetChecker.js            # Budget threshold checking
│   ├── notificationService.js      # Web browser notifications
│   └── exportService.js            # PDF/CSV export
├── screens/
│   ├── LoginScreen.js              # Branded login with logo
│   ├── SignUpScreen.js             # Registration with name, country, currency
│   ├── HomeScreen.js               # Dashboard with charts and quick actions
│   ├── TransactionsScreen.js       # Transaction list with filters and sorting
│   ├── AddTransactionScreen.js     # Add income/expense form
│   ├── AccountsScreen.js           # Account management and transfers
│   ├── BudgetScreen.js             # Budget creation and tracking
│   ├── CategoriesScreen.js         # Category management with emoji icons
│   ├── SavingsGoalsScreen.js       # Savings goals with progress tracking
│   ├── ReportsScreen.js            # Monthly/yearly reports with export
│   ├── SettingsScreen.js           # Profile editing, theme, password change
│   └── TutorialScreen.js           # New user walkthrough
└── assets/
    ├── logo-icon.png               # Calculator icon logo
    ├── logo-full.png               # Full logo with text
    ├── icon.png                    # App icon (1024x1024)
    ├── adaptive-icon.png           # Android adaptive icon
    └── splash-icon.png             # Splash screen icon
```

## Firestore Data Model

| Collection | Description |
|-----------|-------------|
| `transactions` | Income, expense, transfer records per user |
| `accounts` | Bank, cash, credit card, savings, e-wallet accounts |
| `categories` | Custom and default spending/income categories |
| `budgets` | Budget limits with period and category |
| `goals` | Savings goals with target amount and date |
| `settings` | User preferences (budget alert threshold) |
| `profiles` | User profile (name, country, currency) |
| `deletedDefaults` | Tracks deleted default categories per user |

Local storage (AsyncStorage): `pending_transactions` (offline queue), `tutorialComplete`, `themeMode`

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`) — for building APK
- Firebase project with Auth and Firestore enabled

### Installation

```bash
git clone https://github.com/yewest971/FinManager.git
cd FinManager
npm install
```

### Running Locally

```bash
# Start Expo development server
npx expo start

# Press 'w' for web, scan QR for mobile (Expo Go)
```

### Building for Production

**Web:**
```bash
npx expo export --platform web
node postbuild.js
# Deploy dist/ folder to Netlify
```

**Android APK:**
```bash
eas build --platform android --profile preview
```

## Firebase Configuration

The app uses the following Firebase services:
- **Firebase Authentication** — Email/password auth with platform-specific session persistence
- **Cloud Firestore** — Real-time document database with per-user data isolation (`userId` field on all documents)

Firebase config is in `config/firebase.js`. To use your own Firebase project, replace the config values.

## Non-Functional Requirements

| NFR | Requirement | Status | Evidence |
|-----|------------|--------|----------|
| NFR01 | Dashboard loads under 2 seconds | ✅ | Console timer logs load time |
| NFR02 | TLS 1.3 encryption | ✅ | Firebase enforces HTTPS/TLS |
| NFR03 | Password hashing | ✅ | Firebase Auth uses scrypt hashing |
| NFR04 | Secure credential storage | ✅ | AsyncStorage (mobile), localStorage (web) |
| NFR05 | Cross-platform (Android 8+, iOS 13+, Chrome/Firefox/Safari) | ✅ | Tested on all platforms |
| NFR06 | WCAG 2.1 AA accessibility | ✅ | Accessibility labels, 5.5:1 contrast ratio |
| NFR07 | Offline reliability | ✅ | AsyncStorage queue + auto-sync |
| NFR08 | Scalability | ✅ | Firebase free tier supports 1,000 concurrent users |
| NFR09 | Maintainability | ✅ | Regular GitHub commits with descriptive messages |
| NFR10 | SUS usability score 70+ | ✅ | SUS questionnaire included |

## Author

**Raheel Ali** 

## License

This project is developed for academic purposes as part of SEC 6201 Undergraduate Project.
