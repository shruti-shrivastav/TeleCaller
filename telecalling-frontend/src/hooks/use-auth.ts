// src/hooks/useAuth.ts
import { useAppSelector, useAppDispatch } from '@/hooks/use-store';
import { logout } from '@/features/auth/auth-slice';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = (redirectToLogin = false) => {
  const { user, token } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAuthenticated = !!token;
  const role = user?.role || null; // 👈 new line

  useEffect(() => {
    if (redirectToLogin && !isAuthenticated) {
      navigate('/');
    }
  }, [redirectToLogin, isAuthenticated, navigate]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return { user, token, role, isAuthenticated, logout: handleLogout };
};
