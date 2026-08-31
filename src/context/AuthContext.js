'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'change_password'
  
  const isFetchingProfileRef = useRef(false);

  // Helper dịch thông báo lỗi Supabase sang tiếng Việt dễ hiểu
  const translateAuthError = (message) => {
    if (!message) return 'Đã có lỗi xảy ra trong quá trình xác thực';
    const msg = message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại!';
    }
    if (msg.includes('email not confirmed')) {
      return 'Địa chỉ email này chưa được xác thực. Vui lòng kiểm tra hộp thư!';
    }
    if (msg.includes('user not found')) {
      return 'Tài khoản không tồn tại trên hệ thống.';
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return 'Thao tác quá nhanh. Vui lòng đợi trong giây lát rồi thử lại!';
    }
    if (msg.includes('network') || msg.includes('failed to fetch')) {
      return 'Lỗi kết nối mạng đến máy chủ xác thực. Vui lòng thử lại!';
    }
    if (msg.includes('password should be at least')) {
      return 'Mật khẩu phải có tối thiểu 6 ký tự!';
    }
    return message;
  };

  // Lấy thông tin profile từ bảng user_profiles
  const fetchUserProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      return null;
    }

    // Default fallback profile nếu query database gặp sự cố hoặc user mới
    const defaultProfile = {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Người dùng',
      role: authUser.email === 'admin.cdehtkt@gmail.com' ? 'admin' : (authUser.user_metadata?.role || 'viewer'),
      is_active: true
    };

    if (isFetchingProfileRef.current) {
      return defaultProfile;
    }

    try {
      isFetchingProfileRef.current = true;
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
        console.warn('Lỗi lấy profile user_profiles:', error.message);
      }

      if (data) {
        // Nếu là admin email, ưu tiên quyền admin cao nhất
        if (authUser.email === 'admin.cdehtkt@gmail.com') {
          data.role = 'admin';
        }
        setProfile(data);
        return data;
      } else {
        setProfile(defaultProfile);
        return defaultProfile;
      }
    } catch (err) {
      console.error('Lỗi khi fetch profile:', err);
      setProfile(defaultProfile);
      return defaultProfile;
    } finally {
      isFetchingProfileRef.current = false;
    }
  }, []);

  // Khởi tạo và lắng nghe thay đổi phiên đăng nhập
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setLoading(true);
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Lỗi getSession:', error.message);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchUserProfile(initialSession.user);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Lỗi khởi tạo phiên Auth:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Lắng nghe sự kiện Auth state change (đăng nhập, đăng xuất, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !currentSession) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

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
      const cleanEmail = (email || '').trim();
      const cleanPassword = (password || '').trim();

      if (!cleanEmail || !cleanPassword) {
        return { success: false, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu!' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      if (data?.user) {
        setSession(data.session);
        setUser(data.user);
        const prof = await fetchUserProfile(data.user);
        if (prof && prof.is_active === false) {
          await signOut();
          return { success: false, error: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ Quản trị viên!' };
        }
      }

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: translateAuthError(error.message) };
    }
  };

  // Hàm đăng ký tài khoản mới (dành cho Admin hoặc luồng tạo tài khoản)
  const signUp = async ({ email, password, full_name, role = 'viewer' }) => {
    try {
      const cleanEmail = (email || '').trim();
      const cleanPassword = (password || '').trim();
      const cleanName = (full_name || '').trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            role: role
          }
        }
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: translateAuthError(error.message) };
    }
  };

  // Hàm đăng xuất an toàn, giải phóng triệt để phiên làm việc
  const signOut = async () => {
    try {
      // Gọi Supabase Auth signOut (với fallback không chặn UI)
      await supabase.auth.signOut().catch((err) => {
        console.warn('Cảnh báo khi gọi supabase.auth.signOut():', err?.message);
      });
    } catch (error) {
      console.warn('Lỗi khi đăng xuất:', error);
    } finally {
      // Luôn dọn dẹp sạch toàn bộ trạng thái trong React state
      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);

      // Dọn dẹp các token supabase lưu trong localStorage nếu có
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Lỗi dọn localStorage:', e);
        }
      }
    }
    return { success: true };
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
      return { success: false, error: translateAuthError(error.message) };
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
      return { success: false, error: translateAuthError(error.message) };
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
  const userRole = profile?.role || (user?.email === 'admin.cdehtkt@gmail.com' ? 'admin' : (user ? 'viewer' : 'guest'));
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

