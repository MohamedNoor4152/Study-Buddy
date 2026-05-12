import { createContext, useContext, useEffect, useState } from 'react';
import { syncTutorProfileFromUser } from './tutorProfileSync.js';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncIfTutor = (u) => {
      if (u?.user_metadata?.role !== 'tutor') return;
      syncTutorProfileFromUser(u).then(({ error }) => error && console.warn('tutor profile sync', error));
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const next = session?.user ?? null;
      setUser(next);
      syncIfTutor(next);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const next = session?.user ?? null;
      setUser(next);
      syncIfTutor(next);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
