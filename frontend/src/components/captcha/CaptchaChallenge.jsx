import { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { mmss } from '../../utils/format.js';
import s from './captcha.module.css';

export default function CaptchaChallenge({ challenge, locked, onNewCode, onExpire }) {
  const cb = useRef(onExpire); cb.current = onExpire;
  const left = useCountdown(challenge.expiresAt, () => cb.current?.());
  const chars = challenge.question ? [...challenge.question] : [];

  return (
    <section className={s.codeCard} aria-label="CAPTCHA challenge">
      {challenge.imageSvg ? (
        <div className={s.code}><img className={s.codeImg} src={challenge.imageSvg} alt="CAPTCHA code. Pick the option that matches it." /></div>
      ) : (
        <div className={s.code} role="img" aria-label={`CAPTCHA code ${chars.join(' ')}`}>
          {chars.map((c, i) => (
            <span key={`${challenge.challengeId}-${i}`} aria-hidden="true" style={{ '--i': i, '--r': `${((i * 37) % 9) - 4}deg`, '--y': `${((i * 53) % 7) - 3}px` }}>{c}</span>
          ))}
        </div>
      )}
      <div className={s.codeFoot}>
        <button type="button" className={s.textBtn} onClick={onNewCode} disabled={locked}><RefreshCw size={14} /> New Code</button>
        <span className={`${s.timer} ${left <= 20 ? s.timerLow : ''}`} aria-live="off">Expires in {mmss(left)}</span>
      </div>
    </section>
  );
}
