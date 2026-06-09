import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  profile: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role?: string,
    universityId?: string | null
  ) => Promise<any>;
  fetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile in the background
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('Profil yüklenemedi:', profileError.message);
        setProfile(null);
        return;
      }

      if (profileData && profileData.university_id) {
        try {
          const { data: uniData, error: uniError } = await supabase
            .from('universities')
            .select('logo_url')
            .eq('id', profileData.university_id)
            .single();
          
          if (!uniError && uniData) {
            profileData.university_logo_url = uniData.logo_url;
          }
        } catch (uniErr: any) {
          console.warn('Üniversite logosu çekilemedi:', uniErr.message);
        }
      }
      setProfile(profileData);
    } catch (err: any) {
      console.warn('Profil fetch hatası:', err.message);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          await fetchProfile(session.user.id);
          setUser(session.user);
        }
      } catch (error) {
        console.warn('Oturum başlatılamadı:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setLoading(true);
          await fetchProfile(session.user.id);
          setUser(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role = 'student',
    universityId: string | null = null
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          university_id: universityId,
        },
      },
    });
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        signUp,
        fetchProfile: () => user && fetchProfile(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
