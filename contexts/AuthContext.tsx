import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { GoogleUser } from '../types';
import { initGoogleClient, revokeToken } from '../services/google';

interface AuthContextType {
  user: GoogleUser | null;
  isLoggedIn: boolean;
  tokenClient: any | null;
  signIn: () => void;
  signOut: () => void;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [tokenClient, setTokenClient] = useState<any | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isLoggedIn = !!user;

  const signOut = useCallback(() => {
    const token = localStorage.getItem('g_access_token');
    if (token) {
        revokeToken(token);
    }
    setUser(null);
    localStorage.removeItem('g_access_token');
    // Also clear sync-related data
    localStorage.removeItem('ebook-reader-drive-folder-id');
    localStorage.removeItem('ebook-reader-drive-file-id');
    localStorage.removeItem('ebook-reader-last-sync');
    if ((window as any).gapi?.client) {
      (window as any).gapi.client.setToken(null);
    }
  }, []);

  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user profile, status: ${userInfoResponse.status}`);
      }
      const profile = await userInfoResponse.json();
      
      if ((window as any).gapi?.client) {
          (window as any).gapi.client.setToken({ access_token: accessToken });
      } else {
          console.warn("gapi.client not ready when fetching profile.");
      }
      
      setUser({
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      });

    } catch (error) {
      console.error("Token validation/profile fetch failed:", error);
      signOut(); // If profile fetch fails, the token is invalid/expired. Sign out.
    }
  }, [signOut]);

  const handleCredentialResponse = useCallback(async (response: any) => {
    if (response.access_token) {
      localStorage.setItem('g_access_token', response.access_token);
      await fetchUserProfile(response.access_token);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const client = await initGoogleClient(handleCredentialResponse);
        setTokenClient(client);
        setIsInitialized(true); // Signal that client and GAPI are ready
      } catch (error) {
        console.error("Error initializing Google Client:", error);
        setIsInitialized(true); // Still mark as initialized to not block app
      }
    };
    initialize();
  }, [handleCredentialResponse]);

  // Session Restoration Effect
  useEffect(() => {
    if (isInitialized) {
      const storedToken = localStorage.getItem('g_access_token');
      if (storedToken) {
        fetchUserProfile(storedToken);
      }
    }
  }, [isInitialized, fetchUserProfile]);

  const signIn = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }, [tokenClient]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, tokenClient, signIn, signOut, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};