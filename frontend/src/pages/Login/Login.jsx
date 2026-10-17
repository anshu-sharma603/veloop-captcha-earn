import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Gem, Lock, Mail, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './login.css';

const STARS = [['8%', '30%', '0s'], ['86%', '22%', '.7s'], ['92%', '62%', '1.3s'], ['14%', '78%', '1.9s'], ['58%', '4%', '2.3s']];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (!busy) { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [busy]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(''); setBusy(true);
    try { await login(email.trim(), password); }
    catch (err) { setError(err.message || 'Something went wrong.'); setShake((n) => n + 1); setBusy(false); }
  };

  const fillDemo = () => { setEmail('demo@veloop.test'); setPassword('Demo@12345'); setError(''); };

  return (
    <div className="lg">
      <div className="lg-bg" aria-hidden="true">
        <i className="lg-orb lg-o1" /><i className="lg-orb lg-o2" /><i className="lg-orb lg-o3" /><i className="lg-grid" />
      </div>

      <main className="lg-shell">
        <section className="lg-show">
          <div className="lg-brand">VELOOP<small>REWARDS</small></div>
          <h1>Earn Gems.<br /><span>Verified by the server.</span></h1>
          <p>Solve a quick security check, collect your reward and watch your balance grow. Every Gem is recorded in a tamper-proof ledger.</p>

          <div className="lg-hero" aria-hidden="true">
            <i className="lg-glow" /><i className="lg-ring" /><i className="lg-ring lg-r2" />
            <svg className="lg-gem" viewBox="0 0 200 200">
              <polygon points="60,30 140,30 125,80 75,80" fill="#fff3bf" />
              <polygon points="60,30 75,80 20,80" fill="#fcd34d" />
              <polygon points="140,30 180,80 125,80" fill="#f8b62a" />
              <polygon points="20,80 75,80 100,175" fill="#e8920c" />
              <polygon points="75,80 125,80 100,175" fill="#fbbf24" />
              <polygon points="125,80 180,80 100,175" fill="#c2740a" />
            </svg>
            {STARS.map(([t, l, d]) => <i key={l} className="lg-star" style={{ top: t, left: l, '--d': d }} />)}
          </div>

          <ul className="lg-feats">
            <li><ShieldCheck size={16} /> Server-verified answers</li>
            <li><Zap size={16} /> Instant claim</li>
            <li><Gem size={16} /> Ledger-tracked balance</li>
          </ul>
        </section>

        <section className="lg-card">
          <h2>Welcome back</h2>
          <p className="lg-sub">Log in to start earning Gems.</p>

          <form onSubmit={submit} noValidate>
            <div className="lg-field">
              <label htmlFor="lg-email">Email</label>
              <Mail size={18} />
              <input id="lg-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="lg-field">
              <label htmlFor="lg-pass">Password</label>
              <Lock size={18} />
              <input id="lg-pass" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="lg-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <div key={shake} className="lg-error" role="alert">{error}</div>}

            <button type="submit" className="lg-btn" disabled={busy}>
              {busy ? <><i className="lg-spin" />{slow ? 'Waking up the server…' : 'Logging in…'}</> : <>Log in <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="lg-demo"><span>Evaluating? Use the demo account.</span><button type="button" onClick={fillDemo}>Fill demo login</button></div>
          <p className="lg-trust"><Lock size={13} /> Your balance can only change on the server.</p>
        </section>
      </main>
    </div>
  );
}