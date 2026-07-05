import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          // Fetch role (Vendor/Customer) from Supabase
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('uid', session.user.id)
            .single();
          
          if (data && !error) {
            setUserData(data);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
        setLoading(false);
      }
    );
    
    return () => subscription?.unsubscribe();
  }, []);

  const register = async (email, password, name, role) => {
    // Sign up user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) throw new Error(error.message);
    
    // Save additional info to Supabase
    await supabase.from('users').insert([
      {
        uid: data.user.id,
        name,
        email,
        role, // "vendor" or "customer"
        created_at: new Date()
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);