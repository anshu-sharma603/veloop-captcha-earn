import { useCallback, useEffect, useRef, useState } from 'react';
import { captchaService, walletService } from '../services/captchaService.js';
import { sleep } from '../utils/format.js';

const MIN_CHECKING_MS = 800;   // UX polish only: never decides a result
const AD_DEMO_MS = 2200;       // mock rewarded-ad length (demo state, not a real ad)
const RECOVERABLE = new Set(['CHALLENGE_EXPIRED', 'CHALLENGE_ALREADY_COMPLETED', 'CHALLENGE_DISCARDED', 'CHALLENGE_NOT_FOUND', 'REWARD_ALREADY_CLAIMED', 'REWARD_DECLINED', 'CLAIM_EXPIRED', 'CHALLENGE_NOT_VERIFIED']);

/**
 * Phases: loading -> challenge -> selected (0.5s verify animation) -> checking -> result
 *         -> claiming (preparing / mock ad / done) -> challenge ...      | error
 * Every value that matters (challenge, result, reward, balance) is read from the API.
 */
export function useCaptchaFlow() {
  const [phase, setPhase] = useState('loading');
  const [challenge, setChallenge] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [balance, setBalance] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [adStage, setAdStage] = useState(null);
  const [claimed, setClaimed] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const busy = useRef(false);

  const applyChallenge = (c) => { setChallenge(c); setSelected(null); setResult(null); setClaimed(null); setAdStage(null); setPhase('challenge'); };
  const fail = (e) => { setError(e.message || 'Something went wrong.'); setPhase('error'); };

  const fetchNew = useCallback(async () => {
    const res = await captchaService.newCaptcha();
    applyChallenge(res.challenge);
  }, []);

  const load = useCallback(async () => {
    setPhase('loading'); setError(null);
    try {
      const [cfg, wal, cur] = await Promise.all([captchaService.config(), walletService.gems(), captchaService.current()]);
      setConfig(cfg.config); setBalance(wal.balance);
      if (cur.state === 'RESULT') { setResult({ ...cur.result }); setSelected(null); setPhase('result'); }
      else applyChallenge(cur.challenge);
    } catch (e) { fail(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recover = async (e) => {
    if (RECOVERABLE.has(e.code)) {
      setNotice(e.message);
      try { await fetchNew(); const w = await walletService.gems(); setBalance(w.balance); } catch (e2) { fail(e2); }
    } else fail(e);
  };

  const select = useCallback(async (option) => {
    if (busy.current || phase !== 'challenge' || !challenge) return;
    busy.current = true; setNotice(null); setSelected(option); setPhase('selected');
    const request = captchaService.verify(challenge.challengeId, option).then((v) => ({ v }), (e) => ({ e }));
    await sleep(config?.verifyAnimationMs ?? 500);   // ~0.5s verification animation (UI only)
    setPhase('checking');
    const t0 = Date.now();
    const out = await request;                       // the REAL verdict comes from the backend
    await sleep(Math.max(0, MIN_CHECKING_MS - (Date.now() - t0)));
    if (out.e) await recover(out.e);
    else { setResult(out.v); setBalance(out.v.balance); setPhase('result'); }
    busy.current = false;
  }, [phase, challenge, config]);

  const newCode = useCallback(async () => {
    if (busy.current || phase !== 'challenge') return;
    busy.current = true; setNotice(null); setPhase('loading');
    try { await fetchNew(); } catch (e) { fail(e); }
    busy.current = false;
  }, [phase, fetchNew]);

  const noThanks = useCallback(async () => {
    if (busy.current || phase !== 'result') return;
    busy.current = true; setPhase('loading');
    try { await fetchNew(); setHistoryKey((k) => k + 1); } catch (e) { fail(e); }
    busy.current = false;
  }, [phase, fetchNew]);

  const claim = useCallback(async () => {
    if (busy.current || phase !== 'result' || !result) return;
    busy.current = true; setPhase('claiming'); setAdStage('preparing');
    const request = captchaService.claim(result.challengeId).then((c) => ({ c }), (e) => ({ e }));
    await sleep(900);
    setAdStage('ad');
    const out = await request;
    if (out.e) { await recover(out.e); busy.current = false; return; }
    setClaimed(out.c); setBalance(out.c.balance.after);
    await sleep(AD_DEMO_MS);
    setAdStage('done');
    await sleep(1200);
    try { await fetchNew(); setHistoryKey((k) => k + 1); } catch (e) { fail(e); }
    busy.current = false;
  }, [phase, result, fetchNew]);

  return { phase, challenge, selected, result, balance, config, error, notice, adStage, claimed, historyKey, select, newCode, noThanks, claim, retry: load, dismissNotice: () => setNotice(null) };
}
