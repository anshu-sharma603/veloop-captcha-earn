import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { captchaService, walletService } from '../../services/captchaService.js';
import AppHeader from '../../components/captcha/AppHeader.jsx';
import CaptchaChallenge from '../../components/captcha/CaptchaChallenge.jsx';
import CaptchaOption from '../../components/captcha/CaptchaOption.jsx';
import RewardCard from '../../components/captcha/RewardCard.jsx';
import CheckingState from '../../components/captcha/CheckingState.jsx';
import ResultCard from '../../components/captcha/ResultCard.jsx';
import MockAd from '../../components/captcha/MockAd.jsx';
import ErrorState from '../../components/captcha/ErrorState.jsx';
import HistoryPanel from '../../components/captcha/HistoryPanel.jsx';
import TrustList from '../../components/captcha/TrustList.jsx';
import s from '../../components/captcha/captcha.module.css';

// true = design jaisa "Submit Answer" button | false = option click par auto-verify (assignment text)
const REQUIRE_SUBMIT = true;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unwrap = (x) => (x?.result && typeof x.result === 'object' ? x.result : x);

export default function CaptchaEarn() {
  
  const nav = useNavigate();
  const { logout } = useAuth();
  const [view, setView] = useState('loading'); // loading | challenge | verifying | result | claiming | error
  const [challenge, setChallenge] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [claimed, setClaimed] = useState(null);
  const [adStage, setAdStage] = useState('preparing');
  const [balance, setBalance] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [slow, setSlow] = useState(false);
  const [histKey, setHistKey] = useState(0);
  const busy = useRef(false);

  const refreshBalance = useCallback(async () => {
    try { const w = await walletService.gems(); setBalance(w?.balance ?? w); } catch { /* header keeps showing the last value */ }
  }, []);

  const load = useCallback(async (fresh = false) => {
    setView('loading'); setSelected(null); setResult(null); setClaimed(null); setError('');
    try {
      const r = fresh ? await captchaService.newCaptcha() : await captchaService.current();
      if (r.state === 'RESULT' && r.result) { // page refreshed after verify, reward still unclaimed
        setChallenge({ challengeId: r.result.challengeId });
        setResult(r.result); setView('result'); return;
      }
      setChallenge(r.challenge ?? r); setView('challenge');
    } catch (e) { setError(e.message); setView('error'); }
  }, []);

  useEffect(() => {
    load(); refreshBalance();
    captchaService.config().then((c) => setConfig(c?.config ?? c)).catch(() => {});
  }, [load, refreshBalance]);

  // Render free-tier cold start hint
  useEffect(() => {
    if (view !== 'loading') { setSlow(false); return undefined; }
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [view]);

  const submit = async (value) => {
    if (busy.current || view !== 'challenge') return;
    busy.current = true; setSelected(value); setSubmitting(true);
    try {
      await sleep(500); // selection + scan animation
      setView('verifying');
      const [raw] = await Promise.all([captchaService.verify(challenge.challengeId, value), sleep(800)]);
      setResult(unwrap(raw)); setView('result'); setHistKey((k) => k + 1);
    } catch (e) { setError(e.message); setView('error'); } finally { busy.current = false; setSubmitting(false); }
  };

  const choose = (value) => {
    if (submitting) return;
    if (REQUIRE_SUBMIT) setSelected(value); else submit(value);
  };

  const claim = async () => {
    if (busy.current) return;
    busy.current = true; setAdStage('preparing'); setView('claiming');
    try {
      setClaimed(await captchaService.claim(challenge.challengeId));
      await sleep(1000); setAdStage('ad');
      await sleep(2200); setAdStage('done');
      await refreshBalance(); await sleep(1400);
      busy.current = false; await load(true); setHistKey((k) => k + 1);
    } catch (e) { busy.current = false; setError(e.message); setView('error'); }
  };

  const noThanks = async () => {
    if (busy.current) return;
    await load(true); refreshBalance(); setHistKey((k) => k + 1);
  };

  return (
    <div className={s.page}>
      <div className={s.layout}>
        <main className={s.card} aria-live="polite">
          <AppHeader balance={balance} onBack={() => nav('/')} />

          {view === 'loading' && (
            <>
              <h1 className={s.title}>Earn <em>Gems</em></h1>
              <p className={s.lede}>Complete a quick security check to earn rewards.</p>
              <section className={`${s.codeCard} ${s.skelShimmer}`} aria-hidden="true">
                <div className={s.code}>&nbsp;</div>
                <div className={s.codeFoot}><span className={s.textBtn}>↻ New Code</span><span className={s.timer}>Expires in 2:00</span></div>
              </section>
              <p className={s.prompt}>Select the matching code</p>
              <div className={s.grid} aria-busy="true">
                {[0, 1, 2, 3].map((i) => <div key={i} className={`${s.option} ${s.skelShimmer}`} />)}
              </div>
              {REQUIRE_SUBMIT && <div className={`${s.btn} ${s.skelShimmer}`} style={{ width: '100%', marginTop: 16 }} />}
              <div className={`${s.reward} ${s.skelShimmer}`}>
                <span style={{ width: 26, height: 26, flex: 'none' }} />
                <div>Complete verification to earn <b>+1.00 Gem</b><small>A wrong answer still earns +0.50 Gems</small></div>
              </div>
              <div className={`${s.note} ${s.skelShimmer}`}>
                <span style={{ width: 18, height: 18, flex: 'none' }} />This helps protect your account from automated access.
              </div>
              {slow && <div className={s.notice} style={{ position: 'fixed', left: 16, right: 16, bottom: 16, maxWidth: 428, margin: '0 auto' }}>Waking up the server… this can take up to a minute.</div>}
            </>
          )}

          {view === 'error' && <ErrorState message={error || 'Please try again.'} onRetry={() => load()} />}

          {view === 'challenge' && challenge && (
            <>
              <h1 className={s.title}>Earn <em>Gems</em></h1>
              <p className={s.lede}>Complete a quick security check to earn rewards.</p>
              <CaptchaChallenge challenge={challenge} locked={submitting} onNewCode={() => load(true)} onExpire={() => load(true)} />
              <p className={s.prompt}>Select the matching code</p>
              <div className={s.grid}>
                {(challenge.options || []).map((o, i) => (
                  <CaptchaOption key={`${challenge.challengeId}-${i}`} value={o} index={i} selected={selected === o} locked={submitting} onSelect={choose} />
                ))}
              </div>
              {REQUIRE_SUBMIT && (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  style={{ width: '100%', marginTop: 16, color: '#fff', '--tone': '#3b82f6', '--tone-deep': '#2563eb' }}
                  disabled={!selected || submitting}
                  onClick={() => submit(selected)}
                >
                  Submit Answer
                </button>
              )}
              <RewardCard config={config} />
              <div className={s.note}><ShieldCheck size={18} /> This helps protect your account from automated access.</div>
            </>
          )}

          {view === 'verifying' && <CheckingState />}

          {view === 'result' && result && (
            <ResultCard result={result} balance={balance} onClaim={claim} onNoThanks={noThanks} />
          )}

          {view === 'claiming' && <MockAd stage={adStage} claimed={claimed} />}
        </main>

        <HistoryPanel refreshKey={histKey} />
        <button type="button" className={s.textBtn} style={{ alignSelf: 'center', marginTop: 10 }} onClick={logout}>Log out</button>
      </div>

      <footer className={s.strip}><TrustList /></footer>
    </div>
  );
}