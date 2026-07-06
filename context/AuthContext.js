import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // This helper function ensures the logic is centralized
  const handleAuthStateChange = async (session) => {
    if (session) {
      setUser(session.user);
      // Fetch role (Vendor/Customer) from Supabase
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (data && !error) {
        setUserData(data);
      } else {
        setUserData(null);
      }
    } else {
      setUser(null);
      setUserData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // 1. Force a check immediately on load to recover session from AsyncStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    // 2. Listen for future changes (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleAuthStateChange(session);
      }
    );
    
    return () => subscription?.unsubscribe();
  }, []);

  const register = async (email, password, name, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      }
    });
    
    if (error) throw new Error(error.message);

    const userId = data?.user?.id;
    if (!userId) throw new Error('Unable to create account.');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw new Error(signInError.message);
    
    await supabase.from('customers').insert([
      {
        id: userId,
        full_name: name,
        email,
        role,
        created_at: new Date().toISOString(),
        avatar_url: null
      }
    ]);
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw new Error(error.message);
  };
  
  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, userData, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);