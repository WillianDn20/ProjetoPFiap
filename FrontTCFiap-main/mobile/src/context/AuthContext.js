import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_KEY } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ token: null, user: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedSession = await AsyncStorage.getItem(SESSION_KEY);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          if (parsed?.token && parsed?.user?.role === 'teacher') {
            setSession(parsed);
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (error) {
        console.error('Unable to restore the saved session:', error);
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        setReady(true);
      }
    };

    restoreSession();
  }, []);

  const signIn = useCallback(async (nextSession) => {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setSession({ token: null, user: null });
  }, []);

  const value = useMemo(() => ({
    ...session,
    ready,
    isAuthenticated: Boolean(session.token && session.user),
    isTeacher: session.user?.role === 'teacher',
    signIn,
    signOut,
  }), [session, ready, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
