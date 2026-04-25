# Services

This folder contains API service functions and business logic.

## Structure

- `api.ts` - API client configuration and general requests
- `auth.ts` - Authentication API calls
- `wallet.ts` - Wallet API calls
- `investment.ts` - Investment API calls
- `user.ts` - User API calls

## Example

```typescript
import { apiClient } from './api';
import type { User } from '@/types';

export const authService = {
  login: (email: string, password: string) =>
    apiClient.post<{ token: string; user: User }>('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
};
```
