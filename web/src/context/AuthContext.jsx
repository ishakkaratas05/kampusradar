/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profili arka planda çeker — hiçbir zaman auth akışını bloke etmez
  const fetchProfile = (userId) => {
    // await yok — fire and forget, arka planda çalışır
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn("Profil yüklenemedi:", error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      })
      .catch((err) => {
        console.warn("Profil fetch hatası:", err.message);
        setProfile(null);
      });
  };

  useEffect(() => {
    let mounted = true;

    // Mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id); // await yok, bloke etmez
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Giriş yapma — sadece auth, profil arka planda gelir
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Çıkış yapma
  const signOut = async () => {
    setUser(null);
    setProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Kayıt olma
  const signUp = async (email, password, fullName, role = "student", universityId = null) => {
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
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
