import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import s from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await login(email.trim(), password); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <div className={s.page}>
      <form className={s.card} onSubmit={submit}>
        <div className={s.brand}><b>VELOOP</b><small>REWARDS</small></div>
        <h1>Welcome back</h1>
        <p className={s.sub}>Log in to start earning Gems.</p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div className={s.error} role="alert">{err}</div>}
        <button className={s.submit} type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <div className={s.demo}>
          <span>Evaluating? Use the demo account.</span>
          <button type="button" onClick={() => { setEmail('demo@veloop.test'); setPassword('Demo@12345'); }}>Fill demo login</button>
        </div>
      </form>
    </div>
  );
}
