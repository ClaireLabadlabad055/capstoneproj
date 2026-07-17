import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ADMIN_EMAILS } from './admins';

const AuthContext = createContext();

const normalizeApprovalValue = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const resolveApprovalState = (records = []) => {
  const normalizedValues = records
    .map((record) => normalizeApprovalValue(record?.approval_status || record?.status))
    .filter(Boolean);

  if (normalizedValues.some((value) => ['pending', 'pending approval', 'pending review'].includes(value))) {
    return 'pending';
  }

  if (normalizedValues.some((value) => ['rejected', 'declined', 'denied'].includes(value))) {
    return 'rejected';
  }

  if (normalizedValues.some((value) => ['approved', 'active', 'accepted', 'verified', 'complete'].includes(value))) {
    return 'approved';
  }

  return null;
};

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

    const approvalStatus = resolveApprovalState([profileData, customerData, merchantData]);

    const mergedData = {
      ...(profileData || {}),
      ...(customerData || {}),
      ...(merchantData || {}),
      approvalStatus,
      approval_status: approvalStatus,
      role: customerData?.role || profileData?.role || (merchantData ? 'merchant' : 'customer'),
    };

    // Development override: if the authenticated user's email is in ADMIN_EMAILS,
    // force the role to 'admin' without changing the DB. Useful for testing.
    try {
      const { data: { user: authUser } = {} } = await supabase.auth.getUser();
      const authUserEmail = authUser?.email || profileData?.email || customerData?.email || merchantData?.email || null;
      if (authUserEmail && ADMIN_EMAILS.includes(authUserEmail)) {
        mergedData.role = 'admin';
      }
    } catch (e) {
      // ignore and continue
    }

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

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`auth-approval-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'customers', filter: `id=eq.${user.id}` }, () => {
        refreshUserData(user.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchants', filter: `id=eq.${user.id}` }, () => {
        refreshUserData(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
      const userId = data.user.id;

      try {
        const [{ data: customerData }, { data: merchantData }, { data: profileData }] = await Promise.all([
          supabase.from('customers').select('approval_status, status').eq('id', userId).maybeSingle(),
          supabase.from('merchants').select('approval_status, status').eq('id', userId).maybeSingle(),
          supabase.from('profiles').select('approval_status, status').eq('id', userId).maybeSingle(),
        ]);

        const approvalState = resolveApprovalState([profileData, customerData, merchantData]);

        if (approvalState === 'rejected') {
          await supabase.auth.signOut();
          throw new Error('Your registration was rejected. Please contact the admin for more information.');
        }
      } catch (approvalError) {
        if (approvalError instanceof Error) {
          throw approvalError;
        }
        console.error('Error checking approval status', approvalError);
      }

      const profile = await refreshUserData(userId);

      try {
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