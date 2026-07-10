import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLoginStatus, setRecentLoginStatus] = useState(null);

  const refreshUserData = async (userId) => {
    if (!userId) return null;

    const [customerResponse, merchantResponse, profileResponse] = await Promise.all([
      supabase.from('customers').select('*').eq('id', userId).maybeSingle(),
      supabase.from('merchants').select('*').eq('id', userId).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    ]);

    const customerData = customerResponse.data;
    const merchantData = merchantResponse.data;
    const profileData = profileResponse.data;

    const mergedData = {
      ...(profileData || {}),
      ...(customerData || {}),
      ...(merchantData || {}),
      role: customerData?.role || profileData?.role || (merchantData ? 'merchant' : 'customer'),
    };

    setUserData(mergedData);
    return mergedData;
  };

  const handleAuthStateChange = async (session) => {
    setLoading(true);
    if (session) {
      setUser(session.user);
      await refreshUserData(session.user.id);
    } else {
      setUser(null);
      setUserData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleAuthStateChange(session);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const updateLocalUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  const register = async (email, password, name, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: undefined }
    });

    if (error) throw new Error(error.message);

    const userId = data?.user?.id;
    if (!userId) throw new Error('Unable to create account.');

    const { error: insertError } = await supabase.from('customers').insert([
      { id: userId, full_name: name, email, role, created_at: new Date().toISOString() }
    ]);

    if (insertError) throw new Error(insertError.message);
    await supabase.auth.signInWithPassword({ email, password });
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data?.user?.id) {
      const profile = await refreshUserData(data.user.id);

      try {
        const userId = data.user.id;
        const { data: cust } = await supabase.from('customers').select('created_at').eq('id', userId).maybeSingle();
        let isNew = false;
        if (cust && cust.created_at) {
          const created = new Date(cust.created_at).getTime();
          const now = Date.now();
          if (now - created < 30000) isNew = true;
        }
        if (!cust) {
          const { data: prof } = await supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle();
          if (prof && prof.created_at) {
            const created = new Date(prof.created_at).getTime();
            if (Date.now() - created < 30000) isNew = true;
          }
        }
        setRecentLoginStatus({ isNew, email });
      } catch (e) {
        console.error('Error checking new account status', e);
      }

      return profile;
    }
    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      recentLoginStatus,
      setRecentLoginStatus,
      login,
      register,
      logout,
      loading,
      refreshUserData,
      updateLocalUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);