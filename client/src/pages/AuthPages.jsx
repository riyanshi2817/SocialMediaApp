import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthForm({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await (isLogin ? login(form) : register(form)); navigate(location.state?.from?.pathname || '/', { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return <div className="auth-page"><div className="auth-art"><div className="art-copy"><span className="kicker">AI social toolkit</span><h1>Make every image<br /><em>say something.</em></h1><p>Turn the moments worth sharing into captions with a little more spark.</p></div><span className="art-number">01 / 06</span></div><div className="auth-panel"><Link to="/login" className="brand dark-brand"><span className="brand-mark">✦</span> Caption Studio</Link><div className="auth-form-wrap"><span className="kicker">{isLogin ? 'Welcome back' : 'Start creating'}</span><h2>{isLogin ? 'Sign in to your studio' : 'Create your studio'}</h2><p className="muted">{isLogin ? 'Your next great caption is waiting.' : 'A focused home for your visual voice.'}</p><form onSubmit={submit} className="form-stack"><label>Username<input required minLength="3" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="your username" /></label><label>Password<input required minLength="6" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="6+ characters" /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? 'Working...' : isLogin ? 'Enter studio →' : 'Create account →'}</button></form><p className="switch-auth">{isLogin ? 'New here?' : 'Already have an account?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link></p></div></div></div>;
}

export function Login() { return <AuthForm mode="login" />; }
export function Register() { return <AuthForm mode="register" />; }
