'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal() {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    setAuthModalMode, 
    signIn, 
    signUp, 
    changePassword,
    user 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const switchMode = (mode) => {
    resetForm();
    setAuthModalMode(mode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (authModalMode === 'login') {
        if (!email || !password) {
          throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu!');
        }
        const res = await signIn(email, password);
        if (!res.success) {
          throw new Error(res.error || 'Đăng nhập không thành công');
        }
        setSuccessMsg('Đăng nhập thành công!');
        setTimeout(() => {
          handleClose();
        }, 800);
      } else if (authModalMode === 'register') {
        if (!email || !password || !fullName) {
          throw new Error('Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu!');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu phải có tối thiểu 6 ký tự!');
        }
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp!');
        }
        const res = await signUp({ email, password, full_name: fullName, role: 'viewer' });
        if (!res.success) {
          throw new Error(res.error || 'Đăng ký không thành công');
        }
        setSuccessMsg('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
        setTimeout(() => {
          switchMode('login');
        }, 1200);
      } else if (authModalMode === 'change_password') {
        if (!password) {
          throw new Error('Vui lòng nhập mật khẩu mới!');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự!');
        }
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp!');
        }
        const res = await changePassword(password);
        if (!res.success) {
          throw new Error(res.error || 'Đổi mật khẩu thất bại');
        }
        setSuccessMsg('Đổi mật khẩu thành công!');
        setTimeout(() => {
          handleClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          {/* Top Decorative Banner */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          {/* Header */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {authModalMode === 'login' && <LogIn className="w-5 h-5" />}
                {authModalMode === 'register' && <UserPlus className="w-5 h-5" />}
                {authModalMode === 'change_password' && <KeyRound className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {authModalMode === 'login' && 'Đăng nhập Hệ thống'}
                  {authModalMode === 'register' && 'Tạo tài khoản mới'}
                  {authModalMode === 'change_password' && 'Đổi mật khẩu tài khoản'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  CDE-HTKT • Hệ thống Quản lý Bồi thường & GIS
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error & Success Alerts */}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {/* Input: Họ và tên (chỉ mode register) */}
            {authModalMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Họ và tên <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Input: Email (cho login & register) */}
            {authModalMode !== 'change_password' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Địa chỉ Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@cde-htkt.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Input: Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {authModalMode === 'change_password' ? 'Mật khẩu mới' : 'Mật khẩu'} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Input: Confirm Password (cho register & change_password) */}
            {(authModalMode === 'register' || authModalMode === 'change_password') && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Xác nhận mật khẩu <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {authModalMode === 'login' && 'Đăng nhập ngay'}
                    {authModalMode === 'register' && 'Đăng ký tài khoản'}
                    {authModalMode === 'change_password' && 'Cập nhật mật khẩu'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Modes Switch */}
          <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            {authModalMode === 'login' ? (
              <>
                <span>Chưa có tài khoản?</span>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-bold text-emerald-400 hover:underline hover:text-emerald-300 transition-colors"
                >
                  Đăng ký tài khoản mới
                </button>
              </>
            ) : authModalMode === 'register' ? (
              <>
                <span>Đã có tài khoản?</span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-bold text-emerald-400 hover:underline hover:text-emerald-300 transition-colors"
                >
                  Quay lại Đăng nhập
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="font-bold text-slate-400 hover:text-white transition-colors"
              >
                Hủy bỏ
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
