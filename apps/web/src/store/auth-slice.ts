import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User, Wallet } from '@/types/api';

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem('finx.session') ?? 'null') as Pick<AuthState, 'token' | 'user'> | null;
  } catch {
    return null;
  }
})();

const persist = (state: AuthState) => {
  if (!state.token || !state.user) {
    localStorage.removeItem('finx.session');
    return;
  }
  localStorage.setItem('finx.session', JSON.stringify({ token: state.token, user: state.user }));
};

type AuthState = {
  token: string | null;
  user: User | null;
  bootstrapComplete: boolean;
  initialWallet?: Wallet;
};

const initialState: AuthState = {
  token: persisted?.token ?? null,
  user: persisted?.user ?? null,
  bootstrapComplete: true
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ token: string; user: User; wallet?: Wallet }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.initialWallet = action.payload.wallet;
      if (!state.user.avatarUrl) {
        state.user.avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${Math.random().toString(36).substring(2, 10)}`;
      }
      persist(state);
    },
    clearSession: (state) => {
      state.token = null;
      state.user = null;
      state.initialWallet = undefined;
      persist(state);
    },
    setKycVerified: (state, action: PayloadAction<boolean>) => {
      if (!state.user) return;
      state.user.kycVerified = action.payload;
      persist(state);
    },
    setAvatarUrl: (state, action: PayloadAction<string>) => {
      if (!state.user) return;
      state.user.avatarUrl = action.payload;
      persist(state);
    }
  }
});

export const { setSession, clearSession, setKycVerified, setAvatarUrl } = authSlice.actions;
export const authReducer = authSlice.reducer;
