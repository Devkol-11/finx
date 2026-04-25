# @finx/web - Frontend Application

Modern React + TypeScript frontend for FINX fintech platform using Vite, Tailwind CSS, and related tools.

## 📋 Tech Stack

- **React 19** - UI library
- **Vite 8** - Build tool
- **TypeScript 6** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **React Router 7** - Client-side routing
- **TanStack Query 5** - Server state management
- **Zustand 5** - Client state management
- **React Hook Form 7** - Form handling
- **Zod 4** - Schema validation
- **Axios** - HTTP client
- **Radix UI** - Headless components
- **Lucide React** - Icons
- **Recharts** - Data visualization

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.30.0+

### Installation

```bash
# Install all dependencies (from root)
pnpm install

# Install web-specific dependencies (if needed)
pnpm --filter @finx/web install
```

### Environment Setup

Create `.env.local` in the web folder:

```env
VITE_API_URL=http://localhost:3000
VITE_ENV=development
VITE_ENABLE_DEBUG=true
```

## 📁 Project Structure

```
src/
├── components/      # Reusable UI components
├── features/        # Feature modules (auth, wallet, invest, etc.)
├── hooks/           # Custom React hooks
├── middleware/      # Auth and other middleware
├── pages/           # Page components (top-level routes)
├── services/        # API services and business logic
├── store/           # Zustand state stores
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## 🛠️ Development

### Start Development Server

```bash
# From root directory
pnpm dev:web

# Or navigate to web folder and run
pnpm dev
```

The dev server will open at `http://localhost:5173`

### Build for Production

```bash
# From root directory
pnpm build:web

# Or
pnpm --filter @finx/web build
```

### Type Checking

```bash
pnpm --filter @finx/web type-check
```

### Linting

```bash
# Check for linting errors
pnpm --filter @finx/web lint

# Fix linting errors
pnpm --filter @finx/web lint:fix
```

### Code Formatting

```bash
pnpm --filter @finx/web format
```

## 🔄 API Integration

The API client is configured in `src/services/api.ts` with:

- Automatic token injection from localStorage
- 401 error handling (redirects to login)
- Timeout handling
- Type-safe requests

### Example Usage

```typescript
import { apiClient } from '@/services/api';

// GET request
const data = await apiClient.get<User>('/users/me');

// POST request
const response = await apiClient.post<{ token: string }>('/auth/login', {
  email: 'user@example.com',
  password: 'password',
});
```

## 🔐 Authentication

Authentication is managed with:

- **Store**: Zustand (`src/store/auth.ts`)
- **Middleware**: `src/middleware/auth.ts`
- **Token Storage**: localStorage

Protected routes:

```typescript
import { useAuthMiddleware } from '@/middleware/auth'

function ProtectedPage() {
  const isAuthenticated = useAuthMiddleware()

  if (!isAuthenticated) return null

  return <div>Protected Content</div>
}
```

## 📦 State Management

### Global State (Zustand)

```typescript
import { useAuthStore } from '@/store/auth'

function Component() {
  const { user, logout } = useAuthStore()

  return (
    <div>
      <p>Welcome, {user?.firstName}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Server State (TanStack Query)

```typescript
import { useGetUser } from '@/hooks'

function Component() {
  const { data, isLoading, error } = useGetUser('user-id')

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{data?.name}</div>
}
```

## 🧪 Testing

```bash
pnpm --filter @finx/web test
```

## 🚀 Performance

- Code splitting with Vite
- Lazy loading for routes
- Image optimization
- CSS bundling with Tailwind purging

## 📝 Code Style

- **Formatting**: Prettier (configured in `.prettierrc`)
- **Linting**: ESLint (configured in `.eslintrc.json`)
- **Pre-commit hooks**: Set up husky (optional)

## 🤝 Contributing

1. Create feature branches: `git checkout -b feature/your-feature`
2. Follow the project structure and naming conventions
3. Run `pnpm format` and `pnpm lint:fix` before committing
4. Write meaningful commit messages

## 📄 License

Private - FINX Platform
