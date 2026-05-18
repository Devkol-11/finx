import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Middleware to protect routes
export const useAuthMiddleware = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return isAuthenticated;
};

// Redirect authenticated users away from auth pages
export const useGuestMiddleware = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return !isAuthenticated;
};
