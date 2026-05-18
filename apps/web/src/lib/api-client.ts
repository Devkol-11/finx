import axios from "axios";
import { store } from "@/store";
import { clearSession } from "@/store/auth-slice";

const rawBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: `${rawBaseUrl.replace(/\/$/, "")}/api/v1`,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      store.dispatch(clearSession());
    }
    return Promise.reject(error);
  },
);
