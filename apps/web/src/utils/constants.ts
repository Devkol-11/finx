// Global constants
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const APP_NAME = 'FINX';
export const APP_DESCRIPTION = 'Modern Fintech Platform';

export const HTTP_TIMEOUT = 30000; // 30 seconds

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  INVESTMENTS: '/investments',
  WALLET: '/wallet',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please try again.',
  VALIDATION_ERROR: 'Validation error. Please check your inputs.',
  UNAUTHORIZED: 'Unauthorized. Please log in.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
} as const;

export const SUCCESS_MESSAGES = {
  CREATE_SUCCESS: 'Created successfully.',
  UPDATE_SUCCESS: 'Updated successfully.',
  DELETE_SUCCESS: 'Deleted successfully.',
  LOGIN_SUCCESS: 'Logged in successfully.',
} as const;
