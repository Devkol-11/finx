import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, Wallet } from "@/types/api";

type AuthState = {
  token: string | null;
  user: User | null;
  bootstrapComplete: boolean;
  initialWallet?: Wallet;
};

const persisted = (() => {
  try {
    return JSON.parse(localStorage.getItem("finx.session") ?? "null") as Pick<AuthState, "token" | "user"> | null;
  } catch {
    return null;
  }
})();

const initialState: AuthState = {
  token: persisted?.token ?? null,
  user: persisted?.user ?? null,
  bootstrapComplete: true,
};

const persist = (state: AuthState) => {
  if (!state.token || !state.user) {
    localStorage.removeItem("finx.session");
    return;
  }
  localStorage.setItem("finx.session", JSON.stringify({ token: state.token, user: state.user }));
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ token: string; user: User; wallet?: Wallet }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.initialWallet = action.payload.wallet;
      persist(state);
    },
    clearSession: (state) => {
      state.token = null;
      state.user = null;
      state.initialWallet = undefined;
      persist(state);
    },
  },
});

export const { setSession, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
