import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, getRedirectPath } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(getRedirectPath());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-[#111111] font-bold text-2xl mx-auto mb-4"
          >
            RB
          </motion.div>
          <h1 className="text-2xl font-bold text-[#111111]">Red Ball Cricket Academy</h1>
          <p className="text-sm text-[#666666] mt-1">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#666666] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@redball.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[#666666] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </motion.button>
          </form>

          <div className="mt-4 text-center">
            <a href="/forgot-password" className="text-sm text-black hover:text-red-300">
              Forgot password?
            </a>
          </div>
        </div>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 card bg-white/50"
        >
          <p className="text-xs text-[#888888] mb-2 text-center">Demo Credentials</p>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <button
              onClick={() => { setEmail('admin@redball.com'); setPassword('Admin@123'); }}
              className="px-3 py-2 rounded-lg bg-[#F0F0F0] border border-[#EAEAEA] text-[#666666] hover:text-[#111111] hover:border-black/20 transition-all text-left flex justify-between"
            >
              <span className="block font-medium text-[#111111]">Super Admin</span>
              admin@redball.com
            </button>
            <button
              onClick={() => { setEmail('restaurant@redball.com'); setPassword('Manager@123'); }}
              className="px-3 py-2 rounded-lg bg-[#F0F0F0] border border-[#EAEAEA] text-[#666666] hover:text-[#111111] hover:border-black/20 transition-all text-left flex justify-between"
            >
              <span className="block font-medium text-[#111111]">Restaurant Manager</span>
              restaurant@redball.com
            </button>
            <button
              onClick={() => { setEmail('reception@redball.com'); setPassword('Reception@123'); }}
              className="px-3 py-2 rounded-lg bg-[#F0F0F0] border border-[#EAEAEA] text-[#666666] hover:text-[#111111] hover:border-black/20 transition-all text-left flex justify-between"
            >
              <span className="block font-medium text-[#111111]">Receptionist</span>
              reception@redball.com
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
