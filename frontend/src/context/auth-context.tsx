import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import apiClient, { WEB_URL, tokenStorage } from '@/lib/api/client';

WebBrowser.maybeCompleteAuthSession();

export interface User {
  id: number;
  voornaam: string;
  achternaam: string;
  tussenvoegsels?: string | null;
  email: string;
  name?: string;
}

export interface RegisterData {
  voornaam: string;
  tussenvoegsels?: string;
  achternaam: string;
  email: string;
  wachtwoord: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, wachtwoord: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  loginWithGoogleToken: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await tokenStorage.getItem('token');
      if (token) {
        const response = await apiClient.get('/user');
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.warn('Failed to load authenticated user:', err);
      // Only an auth failure ends the session (apiClient already removed the token on 401/302).
      // A network or server error keeps the token and the current user, so a failed refreshUser() doesn't log out.
      if (err?.status === 401 || err?.status === 302) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, wachtwoord: string) => {
    const response = await apiClient.post('/login', {
      email,
      wachtwoord,
      device_name: 'expo-mobile-app',
    });

    if (response.data?.token) {
      await tokenStorage.setItem('token', response.data.token);
    }

    if (response.data?.user) {
      setUser(response.data.user);
    } else {
      await loadUser();
    }
  };

  const register = async (data: RegisterData) => {
    const response = await apiClient.post('/register', {
      ...data,
      device_name: 'expo-mobile-app',
    });

    if (response.data?.token) {
      await tokenStorage.setItem('token', response.data.token);
    }

    if (response.data?.user) {
      setUser(response.data.user);
    } else {
      await loadUser();
    }
  };

  const loginWithGoogle = async () => {
    // Web OAuth flow (the redirect URI registered with Google); the backend
    // sends the Sanctum token back to `redirectUrl` as a query parameter.
    const redirectUrl = Linking.createURL('login');
    const googleAuthUrl = `${WEB_URL}/auth/google?app_redirect=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, redirectUrl);

    if (result.type === 'success' && result.url) {
      const urlObj = new URL(result.url);
      const token = urlObj.searchParams.get('token');
      const errorMsg = urlObj.searchParams.get('error');

      if (errorMsg) {
        throw new Error(errorMsg);
      }

      if (!token) {
        throw new Error('Inloggen met Google mislukt.');
      }

      await tokenStorage.setItem('token', token);
      await loadUser();
      if (!(await tokenStorage.getItem('token'))) {
        throw new Error('Inloggen met Google mislukt.');
      }
    }
  };

  const loginWithGoogleToken = async (idToken: string) => {
    const response = await apiClient.post('/auth/google/token', {
      id_token: idToken,
    });

    if (response.data?.token) {
      await tokenStorage.setItem('token', response.data.token);
    }

    if (response.data?.user) {
      setUser(response.data.user);
    } else {
      await loadUser();
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout');
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      await tokenStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        loginWithGoogleToken,
        logout,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
