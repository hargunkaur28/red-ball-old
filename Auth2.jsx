import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { toast } from 'sonner';

const demoCreds = [
  { role: 'Super Admin', email: 'admin@redball.com', pass: 'Admin@123' },
  { role: 'Receptionist', email: 'reception@redball.com', pass: 'Reception@123' },
  { role: 'Restaurant Manager', email: 'restaurant@redball.com', pass: 'Manager@123' },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: 'Elite Academy',
    desc: 'Personalized coaching from experts',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="16" cy="16" r="2.5"/><path d="M16 14.5v1.5l1 1"/>
      </svg>
    ),
    label: 'Instant Booking',
    desc: 'Schedule sessions 24/7',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    label: 'AI Analytics',
    desc: 'Data-driven performance insights',
  },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: #080808; }

.auth-root {
  min-height: 100vh;
  background: #080808;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow', sans-serif;
  position: relative;
  overflow: hidden;
}

.auth-card {
  width: 100%;
  max-width: 1120px;
  min-height: 640px;
  display: flex;
  overflow: hidden;
  position: relative;
  box-shadow: 0 40px 140px rgba(0,0,0,0.85);
  border-radius: 4px;
}

/* ── BRAND PANEL ── */
.brand-panel {
  width: 52%;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.brand-bg {
  position: absolute;
  inset: 0;
  background-image: url('/auth-bg.png');
  background-size: cover;
  background-position: center top;
}

.brand-overlay-dark {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(0,0,0,0.0) 60%, rgba(0,0,0,0.65) 100%),
    linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.5) 100%),
    linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 30%);
}

.brand-red-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 70% at 35% 45%, rgba(200,16,46,0.28) 0%, transparent 65%);
}

.brand-edge-glow {
  position: absolute;
  inset: 0;
  box-shadow: inset 3px 0 80px rgba(200,16,46,0.2), inset 0 3px 40px rgba(200,16,46,0.08);
  pointer-events: none;
}

/* Red border line on right edge (divider between panels) */
.brand-divider {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent 0%, rgba(200,16,46,0.5) 30%, rgba(200,16,46,0.7) 55%, rgba(200,16,46,0.4) 80%, transparent 100%);
  z-index: 20;
}

.laser {
  position: absolute;
  height: 1.5px;
  pointer-events: none;
  transform-origin: left center;
}

.rb-logo {
  position: absolute;
  top: 32px;
  left: 36px;
  z-index: 10;
  width: 52px;
  height: 52px;
  background: #C8102E;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 19px;
  letter-spacing: -1px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(200,16,46,0.55), 0 0 0 1px rgba(255,255,255,0.1);
}

.brand-content {
  position: relative;
  z-index: 10;
  padding: 0 36px 40px 36px;
}

.brand-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-style: italic;
  font-weight: 900;
  font-size: 76px;
  line-height: 0.88;
  letter-spacing: -1px;
  color: #fff;
  text-transform: uppercase;
  margin-bottom: 16px;
  text-shadow: 2px 4px 24px rgba(0,0,0,0.7);
}

.brand-title .red { color: #C8102E; }

.brand-desc {
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.52);
  line-height: 1.9;
  max-width: 230px;
  margin-bottom: 28px;
}

.feature-cards { display: flex; gap: 9px; }

.feat-card {
  flex: 1;
  background: rgba(18,18,18,0.75);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 12px;
  padding: 13px 11px;
  backdrop-filter: blur(16px);
  transition: border-color 0.2s, background 0.2s;
}
.feat-card:hover {
  border-color: rgba(200,16,46,0.45);
  background: rgba(30,8,12,0.8);
}

.feat-icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  background: rgba(200,16,46,0.12);
  border: 1px solid rgba(200,16,46,0.3);
  display: flex; align-items: center; justify-content: center;
  color: #C8102E;
  margin-bottom: 9px;
}

.feat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 4px;
}

.feat-desc { font-size: 9.5px; color: rgba(255,255,255,0.38); line-height: 1.5; }

/* ── FORM PANEL ── */
.form-panel {
  width: 48%;
  background: #111;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px 52px;
  position: relative;
}

.form-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 26px 26px;
  pointer-events: none;
}

.form-inner {
  position: relative;
  z-index: 1;
  max-width: 355px;
  width: 100%;
}

.form-heading {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 36px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 2px;
  line-height: 1;
}

.form-subheading {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  margin-bottom: 30px;
}

.field-wrap { margin-bottom: 11px; }

.field-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.32);
  margin-bottom: 5px;
  padding-left: 1px;
}

.field-inner { position: relative; display: flex; align-items: center; }

.field-icon {
  position: absolute;
  left: 13px;
  color: rgba(255,255,255,0.28);
  display: flex;
  align-items: center;
  pointer-events: none;
  transition: color 0.2s;
  z-index: 1;
}

.field-wrap:focus-within .field-icon { color: #C8102E; }

.field-input {
  width: 100%;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 9px;
  padding: 13px 14px 13px 39px;
  color: #fff;
  font-size: 13.5px;
  font-family: 'Barlow', sans-serif;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  -webkit-appearance: none;
}
.field-input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.045) inset !important;
  -webkit-text-fill-color: #fff !important;
}
.field-input:focus {
  border-color: rgba(200,16,46,0.55);
  background: rgba(255,255,255,0.065);
}
.field-input.has-error { border-color: rgba(200,16,46,0.45); }

.eye-btn {
  position: absolute; right: 11px;
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.22);
  display: flex; align-items: center; padding: 4px;
  transition: color 0.2s;
}
.eye-btn:hover { color: rgba(255,255,255,0.55); }

.remember-row {
  display: flex; align-items: center; justify-content: space-between;
  margin: 2px 0 14px;
}
.remember-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.remember-box {
  width: 15px; height: 15px; border-radius: 4px;
  border: 1.5px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.04);
  flex-shrink: 0;
}
.remember-text { font-size: 12px; color: rgba(255,255,255,0.36); }
.forgot-btn {
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: rgba(255,255,255,0.36);
  font-family: 'Barlow', sans-serif; transition: color 0.2s;
}
.forgot-btn:hover { color: rgba(255,255,255,0.7); }

.submit-btn {
  width: 100%;
  background: #C8102E;
  border: none; border-radius: 9px;
  padding: 15px;
  color: #fff;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: background 0.18s, transform 0.1s;
  box-shadow: 0 6px 28px rgba(200,16,46,0.38);
  margin-top: 2px;
}
.submit-btn:hover { background: #a80e27; }
.submit-btn:active { transform: scale(0.99); }
.submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.spinner {
  width: 17px; height: 17px;
  border: 2px solid rgba(255,255,255,0.28);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.toggle-row { text-align: center; margin-top: 18px; }
.toggle-text { font-size: 12.5px; color: rgba(255,255,255,0.32); }
.toggle-btn {
  background: none; border: none; cursor: pointer;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700; font-size: 13.5px;
  color: #fff; letter-spacing: 0.04em;
  text-decoration: underline;
  text-decoration-color: rgba(255,255,255,0.18);
  text-underline-offset: 3px;
  transition: color 0.2s; margin-left: 4px;
}
.toggle-btn:hover { color: #C8102E; }

.demo-section { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.055); }
.demo-toggle {
  width: 100%; background: none; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(255,255,255,0.2); transition: color 0.2s;
}
.demo-toggle:hover { color: rgba(255,255,255,0.45); }
.demo-toggle.active { color: rgba(200,16,46,0.75); }

.demo-cred {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; border-radius: 9px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.055);
  cursor: pointer; text-align: left; width: 100%;
  transition: border-color 0.2s, background 0.2s;
  margin-top: 7px;
}
.demo-cred:hover { border-color: rgba(200,16,46,0.3); background: rgba(255,255,255,0.06); }
.demo-role {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 800;
  font-size: 8.5px; letter-spacing: 0.15em; color: #C8102E;
  text-transform: uppercase; margin-bottom: 2px;
}
.demo-email { font-size: 11px; color: rgba(255,255,255,0.45); }

.back-btn {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: none; border: none; cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(255,255,255,0.25); transition: color 0.2s;
}
.back-btn:hover { color: rgba(255,255,255,0.6); }
`;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { login, register, getRedirectPath } = useAuthStore();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleDemoFill = (cred) => {
    setFormData({ ...formData, email: cred.email, password: cred.pass });
    setIsLogin(true);
    toast.success(`Filled ${cred.role} credentials`);
  };

  const validate = () => {
    const e = {};
    if (!formData.email) e.email = 'Email is required';
    if (!formData.password) e.password = 'Password is required';
    if (!isLogin) {
      if (!formData.name) e.name = 'Full name is required';
      if (!formData.phone) e.phone = 'Phone number is required';
      if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (formData.password.length < 6) e.password = 'Password must be at least 6 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back to the Academy!');
      } else {
        await register({ name: formData.name, email: formData.email, phone: formData.phone, password: formData.password });
        toast.success('Account created! Welcome to Red Ball Academy.');
      }
      navigate(getRedirectPath());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuth = () => { setIsLogin(!isLogin); setErrors({}); };

  const laserLines = [
    { top: '20%', width: '60%', left: '-5%', angle: -20, dur: 4.2 },
    { top: '33%', width: '75%', left: '8%',  angle: -24, dur: 5.8 },
    { top: '46%', width: '65%', left: '-8%', angle: -16, dur: 3.6 },
    { top: '59%', width: '80%', left: '4%',  angle: -22, dur: 4.9 },
    { top: '71%', width: '55%', left: '-2%', angle: -13, dur: 3.3 },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="auth-root">
        <div className="auth-card">

          {/* ══ BRAND PANEL ══ */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 75, damping: 20 }}
            className="brand-panel"
            style={{ order: isLogin ? 1 : 2 }}
          >
            <div className="brand-bg" />
            <div className="brand-overlay-dark" />
            <div className="brand-red-glow" />
            <div className="brand-edge-glow" />
            <div className="brand-divider" />

            {laserLines.map((l, i) => (
              <motion.div
                key={i}
                className="laser"
                animate={{ opacity: [0.2, 0.7, 0.2], scaleX: [1, 1.06, 1] }}
                transition={{ duration: l.dur, repeat: Infinity, delay: i * 0.55, ease: 'easeInOut' }}
                style={{
                  top: l.top, left: l.left, width: l.width,
                  background: `linear-gradient(90deg, transparent 0%, rgba(200,16,46,0.7) 35%, rgba(255,50,70,1) 55%, rgba(200,16,46,0.5) 75%, transparent 100%)`,
                  filter: 'blur(0.6px)',
                  transform: `rotate(${l.angle}deg)`,
                  transformOrigin: 'left center',
                }}
              />
            ))}

            <div className="rb-logo">RB</div>

            <div className="brand-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'bl' : 'bs'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="brand-title">
                    {isLogin ? 'PLAY' : 'TRAIN'}<br />
                    <span className="red">{isLogin ? 'HARDER' : 'BETTER'}</span>
                  </div>
                  <div className="brand-desc">
                    {isLogin
                      ? 'Access your sessions, track progress, and manage your membership in real-time.'
                      : 'Join the most advanced cricket academy platform. Professional coaching, smart bookings, and elite tracking.'}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="feature-cards">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.label}
                    className="feat-card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                  >
                    <div className="feat-icon">{f.icon}</div>
                    <div className="feat-label">{f.label}</div>
                    <div className="feat-desc">{f.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ══ FORM PANEL ══ */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 75, damping: 20 }}
            className="form-panel"
            style={{ order: isLogin ? 2 : 1 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'fl' : 'fs'}
                className="form-inner"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.28 }}
              >
                <div className="form-heading">{isLogin ? 'Welcome Back' : 'Join the Elite'}</div>
                <div className="form-subheading">
                  {isLogin ? 'Enter your credentials to continue' : 'Start your journey at Red Ball Academy'}
                </div>

                <form onSubmit={handleSubmit}>
                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <InputField label="Full Name" name="name" type="text" value={formData.name} onChange={handleChange} error={errors.name} icon={<PersonIcon />} />
                        <InputField label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} error={errors.phone} icon={<PhoneIcon />} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} icon={<MailIcon />} />
                  <PasswordField label="Password" name="password" show={showPassword} onToggle={() => setShowPassword(!showPassword)} value={formData.password} onChange={handleChange} error={errors.password} />

                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <PasswordField label="Confirm Password" name="confirmPassword" show={showPassword} onToggle={() => setShowPassword(!showPassword)} value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isLogin && (
                    <div className="remember-row">
                      <label className="remember-label">
                        <div className="remember-box" />
                        <span className="remember-text">Remember me</span>
                      </label>
                      <button type="button" className="forgot-btn">Forgot password?</button>
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? <div className="spinner" /> : <>{isLogin ? 'Sign In' : 'Create Account'}<ArrowIcon /></>}
                  </button>
                </form>

                <div className="toggle-row">
                  <span className="toggle-text">{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
                  <button className="toggle-btn" onClick={toggleAuth}>{isLogin ? 'Join the Academy' : 'Sign in here'}</button>
                </div>

                {isLogin && (
                  <div className="demo-section">
                    <button
                      type="button"
                      className={`demo-toggle ${showDemo ? 'active' : ''}`}
                      onClick={() => setShowDemo(!showDemo)}
                    >
                      <SparkleIcon active={showDemo} />
                      {showDemo ? 'Hide Demo Access' : 'Show Demo Access'}
                    </button>
                    <AnimatePresence>
                      {showDemo && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {demoCreds.map((c) => (
                            <button key={c.role} type="button" className="demo-cred" onClick={() => handleDemoFill(c)}>
                              <div>
                                <div className="demo-role">{c.role}</div>
                                <div className="demo-email">{c.email}</div>
                              </div>
                              <ChevronIcon />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="back-btn"
          onClick={() => navigate('/')}
        >
          <ArrowLeftIcon /> Back to home
        </motion.button>
      </div>
    </>
  );
}

function InputField({ label, name, type, value, onChange, error, icon }) {
  return (
    <div className="field-wrap">
      <div className="field-label">{label}</div>
      <div className="field-inner">
        <span className="field-icon">{icon}</span>
        <input name={name} type={type} value={value} onChange={onChange} className={`field-input${error ? ' has-error' : ''}`} autoComplete="off" />
      </div>
    </div>
  );
}

function PasswordField({ label, name, show, onToggle, value, onChange, error }) {
  return (
    <div className="field-wrap">
      <div className="field-label">{label}</div>
      <div className="field-inner">
        <span className="field-icon"><LockIcon /></span>
        <input name={name} type={show ? 'text' : 'password'} value={value} onChange={onChange} className={`field-input${error ? ' has-error' : ''}`} />
        <button type="button" className="eye-btn" onClick={onToggle} tabIndex={-1}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

const MailIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>;
const LockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const PersonIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const PhoneIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 14 19.79 19.79 0 0 1 1 5.22 2 2 0 0 1 2.92 3h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.46 2.11L7.09 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const EyeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const ArrowIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const ArrowLeftIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const ChevronIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const SparkleIcon = ({ active }) => <svg width="11" height="11" viewBox="0 0 24 24" fill={active ? '#C8102E' : 'none'} stroke={active ? '#C8102E' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;