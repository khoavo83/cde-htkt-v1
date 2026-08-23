'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'change_password'

  // Lấy thông tin profile từ bảng user_profiles
  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          staffs (
            id,
            full_name,
            position,
            phone,
            email
          )
        `)
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Lỗi lấy profile:', error);
      }

      if (data) {
        setProfile(data);
        return data;
      } else {
        // Tạo profile fallback nếu trigger chưa kịp ghi
        const defaultProfile = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Người dùng',
          role: authUser.user_metadata?.role || 'viewer',
          is_active: true
        };
        setProfile(defaultProfile);
        return defaultProfile;
      }
    } catch (err) {
      console.error('Lỗi khi fetch profile:', err);
      return null;
    }
  }, []);

  // Khởi tạo và lắng nghe thay đổi phiên đăng nhập
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setLoading(true);
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            await fetchUserProfile(initialSession.user);
          }
        }
      } catch (error) {
        console.error('Lỗi khởi tạo phiên Auth:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Lắng nghe sự kiện Auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Hàm đăng nhập
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      if (data.user) {
        const prof = await fetchUserProfile(data.user);
        if (prof && prof.is_active === false) {
          await supabase.auth.signOut();
          throw new Error('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên!');
        }
      }

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message || 'Đăng nhập thất bại' };
    }
  };

  // Hàm đăng ký tài khoản mới (từ trang hoặc admin)
  const signUp = async ({ email, password, full_name, role = 'viewer' }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: full_name?.trim(),
            role: role
          }
        }
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message || 'Đăng ký tài khoản thất bại' };
    }
  };

  // Hàm đăng xuất
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Đổi mật khẩu
  const changePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Đổi mật khẩu thất bại' };
    }
  };

  // Cập nhật profile cá nhân
  const updateProfile = async ({ full_name, avatar_url }) => {
    if (!user) return { success: false, error: 'Chưa đăng nhập' };
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ full_name, avatar_url })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        return { success: true };
      }
      throw new Error(data.error || 'Cập nhật thất bại');
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Làm mới profile
  const refreshProfile = () => {
    if (user) return fetchUserProfile(user);
  };

  // Mở modal Auth
  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Phân quyền nhanh
  const userRole = profile?.role || (user ? 'viewer' : 'guest');
  const isAdmin = userRole === 'admin';
  const isEditor = isAdmin || userRole === 'editor';
  const isViewer = true; // Mọi người đều có quyền xem (Read-only)
  const isAuthenticated = !!user;

  const value = {
    user,
    session,
    profile,
    loading,
    role: userRole,
    isAdmin,
    isEditor,
    isViewer,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    changePassword,
    updateProfile,
    refreshProfile,
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    setAuthModalMode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
