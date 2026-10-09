import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './captchaEarn.css';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (o, keys) => {
  for (const k of keys) {
    if (o?.[k] != null) return Number(o[k]) / (/milli/i.test(k) ? 1000 : 1);
  }
  return null;
};
const fmt = (n) => (n == null || Number.isNaN(n) ? '--' : Number(n).toFixed(2));
const unwrap = (x) => (x?.result && typeof x.result === 'object' ? x.result : x);
const Gem = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="#fbbf24" /><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" stroke="#b45309" strokeWidth="1" fill="none" /></svg>
);

export default function CaptchaEarn() {
  const { token, logout } = useAuth();
  const nav = useNavigate();
  const [view, setView] = useState('loading');
  const [ch, setCh] = useState(null);
  const [sel, setSel] = useState(null);
  const [bal, setBal] = useState(null);
  const [prev, setPrev] = useState(null);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [adMsg, setAdMsg] = useState('');
  const [wake, setWake] = useState(false);
  const [rw, setRw] = useState({ ok: 1, bad: 0.5 });
  const busy = useRef(false);

  const api = useCallback(async (path, method = 'GET', body) => {
    const tries = method === 'GET' ? 4 : 1;
    for (let i = 1; i <= tries; i++) {
      let r;
      try {
        r = await fetch('/api' + path, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        if (i < tries) { setWake(true); await sleep(4000); continue; }
        throw Object.assign(new Error('Cannot reach the server. Please try again in a minute.'), { status: 0 });
      }
      if ([502, 503, 504].includes(r.status) && i < tries) { setWake(true); await sleep(4000); continue; }
      setWake(false);
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) logout?.();
      if (!r.ok) throw Object.assign(new Error(`${j.message || r.statusText || 'Request failed'} (HTTP ${r.status} · ${path})`), { status: r.status });
      return j.data ?? j;
    }
  }, [token, logout]);

  const wallet = useCallback(async () => {
    try {
      const w = await api('/wallet/gems');
      const b = num(w, ['balance', 'gems', 'amount', 'balanceMilli', 'gemsMilli']);
      setBal(b);
      return b;
    } catch { return null; }
  }, [api]);

  const load = useCallback(async (fresh = false) => {
    setView('loading'); setSel(null); setRes(null); setErr('');
    try {
      let c;
      if (fresh) {
        try { c = await api('/captcha/new', 'POST'); }
        catch (e) { if (e.status === 404 || e.status === 405) c = await api('/captcha/new'); else throw e; }
      } else c = await api('/captcha/current');

      if (c.state === 'RESULT' && c.result) {
        const r = c.result;
        const amt = num(r.reward, ['amount', 'gems', 'amountMilli']);
        const b = await wallet();
        setCh({ id: r.challengeId, opts: [] });
        setPrev(b);
        setRes({ ok: String(r.result).toUpperCase() === 'CORRECT', amt, nb: (b ?? 0) + (amt ?? 0) });
        setView('result');
        return;
      }

      c = c.challenge ?? c;
      const opts = (c.options || []).map((o) => (typeof o === 'string'
        ? { key: o, label: o }
        : { key: o.id ?? o.value ?? o.text, label: o.value ?? o.text ?? o.label ?? o.id }));
      const img = c.image || c.svg;
      setCh({
        id: c.challengeId ?? c.id,
        text: c.question ?? c.captchaText ?? c.text,
        opts,
        img: img ? (img.trim().startsWith('<') ? 'data:image/svg+xml;utf8,' + encodeURIComponent(img) : img) : null,
      });
      setView('challenge');
    } catch (e) { setErr(e.message); setView('error'); }
  }, [api, wallet]);

  useEffect(() => {
    load(); wallet();
    api('/captcha/config').then((c) => {
      c = c.config ?? c;
      const ok = num(c, ['correctReward', 'correctRewardMilli']);
      const bad = num(c, ['wrongReward', 'wrongRewardMilli']);
      if (ok != null) setRw({ ok, bad: bad ?? 0.5 });
    }).catch(() => {});
  }, [load, wallet, api]);

  const pick = async (o) => {
    if (busy.current || view !== 'challenge') return;
    busy.current = true; setSel(o.key); setPrev(bal);
    await sleep(500); setView('verifying');
    try {
      const [raw] = await Promise.all([
        api('/captcha/verify', 'POST', { challengeId: ch.id, selectedOption: o.key }),
        sleep(900),
      ]);
      const r = unwrap(raw);
      const amt = typeof r.reward === 'object'
        ? num(r.reward, ['amount', 'gems', 'amountMilli'])
        : num(r, ['reward', 'rewardAmount', 'rewardMilli']);
      const nb = await wallet();
      setRes({ ok: String(r.result).toUpperCase() === 'CORRECT', amt, nb: nb != null && nb !== prev ? nb : (prev ?? 0) + (amt ?? 0) });
      setView('result');
    } catch (e) { setErr(e.message); setView('error'); }
    busy.current = false;
  };

  const claim = async () => {
    if (busy.current) return; busy.current = true;
    setView('claiming'); setAdMsg('Preparing reward…');
    try {
      await api('/captcha/claim', 'POST', { challengeId: ch.id });
      await sleep(900); setAdMsg('Mock rewarded ad (demo)'); await sleep(1400);
      await wallet(); busy.current = false; await load(true);
    } catch (e) { busy.current = false; setErr(e.message); setView('error'); }
  };
  const skip = async () => { await load(true); wallet(); };

  const ok = res?.ok;
  return (
    <div className="ce">
      <header className="ce-top">
        <button className="ce-ico" aria-label="Back" onClick={() => nav('/')}>‹</button>
        <div className="ce-logo">VELOOP<small>REWARDS</small></div>
        <div className="ce-bal"><Gem />{fmt(bal)}</div>
      </header>

      <main className="ce-main" aria-live="polite">
        {view === 'loading' && (
          <div className="ce-center">
            <div className="ce-spin" />
            <p>{wake ? 'Waking up the server… this can take up to a minute.' : 'Loading challenge…'}</p>
          </div>
        )}

        {view === 'error' && (
          <div className="ce-center">
            <div className="ce-badge bad">!</div>
            <h2 className="bad">Something went wrong</h2>
            <p>{err || 'Please try again.'}</p>
            <button className="ce-btn blue" onClick={() => { wallet(); load(); }}>Try Again</button>
            <button className="ce-btn ghost" onClick={() => load(true)}>Get New Code</button>
          </div>
        )}

        {view === 'challenge' && (
          <section className="ce-in">
            <h1>Earn <span>Gems</span></h1>
            <p className="ce-sub">Complete a quick security check to earn rewards.</p>
            <div className="ce-code">
              {ch?.img
                ? <img src={ch.img} alt="CAPTCHA code" />
                : <div className="ce-chars" aria-label={ch?.text}>{String(ch?.text || '').split('').map((c, i) => <span key={i} style={{ animationDelay: `${i * 60}ms` }}>{c}</span>)}</div>}
              <button className="ce-new" onClick={() => load(true)}>↻ New Code</button>
            </div>
            <p className="ce-lbl">Select the matching code</p>
            <div className="ce-opts">
              {ch?.opts.map((o) => (
                <button key={o.key} className={`ce-opt ${sel === o.key ? 'on' : ''}`} disabled={!!sel} onClick={() => pick(o)}>
                  {o.label}{sel === o.key && <i>✓</i>}{sel === o.key && <b className="ce-scan" />}
                </button>
              ))}
            </div>
            <div className="ce-reward"><Gem s={28} /><div><b>Complete verification to earn <em>+{rw.ok} Gem</em></b><small>A wrong answer still earns +{rw.bad} Gems</small></div></div>
            <p className="ce-note">🛡 This helps protect your account from automated access.</p>
          </section>
        )}

        {view === 'verifying' && (
          <div className="ce-center">
            <div className="ce-lock"><i /><i /><span>🔒</span></div>
            <h2>Verifying…</h2>
            <p>Checking your answer…</p>
            <div className="ce-bar"><b /></div>
            <p className="ce-note">Do not close this screen while verification is in progress.</p>
          </div>
        )}

        {view === 'result' && res && (
          <div className="ce-center ce-in">
            <div className={`ce-badge ${ok ? 'good' : 'bad'}`}>{ok ? '✓' : '✕'}</div>
            <h2 className={ok ? 'good' : 'bad'}>{ok ? 'Verification Complete!' : 'Verification Unsuccessful'}</h2>
            <p>{ok ? 'You earned' : "The selected code doesn't match the image shown."}</p>
            <div className="ce-amt"><Gem s={30} />+{fmt(res.amt)} Gem{res.amt === 1 ? '' : 's'}</div>
            <div className="ce-bals">
              <div><b>{fmt(prev)}</b><small>Previous Balance</small></div>
              <span>→</span>
              <div><b>{fmt(res.nb)}</b><small>New Balance</small></div>
            </div>
            <button className={`ce-btn ${ok ? 'green' : 'red'}`} onClick={claim}>{ok ? 'Add to Balance' : 'Claim Reward'}</button>
            <button className="ce-btn ghost" onClick={skip}>{ok ? 'Maybe Later' : 'No Thanks'}</button>
            <p className="ce-note">🛡 {ok ? 'Your reward is secured by our servers.' : 'Security checks keep your account safe.'}</p>
          </div>
        )}

        {view === 'claiming' && (
          <div className="ce-center"><div className="ce-spin" /><h2>{adMsg}</h2><p>Demo state, no real ad network.</p></div>
        )}
      </main>
    </div>
  );
}