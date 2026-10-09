import { ArrowRight, Check, X } from 'lucide-react';
import GemIcon from '../common/GemIcon.jsx';
import ClaimButton from './ClaimButton.jsx';
import { useCountUp } from '../../hooks/useCountUp.js';
import { fmt, gemWord } from '../../utils/format.js';
import s from './captcha.module.css';

const PIECES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2; const r = 62 + (i % 3) * 10;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, c: ['#2fd27a', '#38d5ff', '#f5b93b', '#7c5cff'][i % 4] };
});

export default function ResultCard({ result, balance, onClaim, onNoThanks, disabled }) {
  const ok = result.result === 'CORRECT';
  const amount = result.reward.amount;
  const shown = useCountUp(amount);
  const tone = ok ? { '--tone': 'var(--green)', '--tone-deep': 'var(--green-deep)' } : { '--tone': 'var(--red)', '--tone-deep': 'var(--red-deep)' };
  const before = balance?.amount ?? 0;

  return (
    <div className={s.result} style={tone} role="status" aria-live="polite">
      <div className={s.medal}>
        {ok && <div className={s.confetti} aria-hidden="true">{PIECES.map((p, i) => <i key={i} style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--c': p.c }} />)}</div>}
        <div className={s.medalCircle}>{ok ? <Check size={46} strokeWidth={3} /> : <X size={46} strokeWidth={3} />}</div>
      </div>
      <span className={s.tag}>{ok ? 'CORRECT' : 'INCORRECT'}</span>
      <h3>{ok ? 'Verification Complete!' : 'Verification Unsuccessful'}</h3>
      <p>{ok ? 'CAPTCHA verified successfully' : "That answer wasn't correct"}</p>
      <div className={s.amount}><GemIcon size={30} /><span>+{fmt(shown)} {gemWord(amount)}</span></div>
      <div className={s.balRow} aria-label="Balance preview">
        <div><b>{fmt(before)}</b><small>Current balance</small></div>
        <ArrowRight size={18} aria-hidden="true" />
        <div><b>{fmt(before + amount)}</b><small>After claiming</small></div>
      </div>
      <div className={s.actions}>
        <ClaimButton onClick={onClaim} disabled={disabled}>Claim</ClaimButton>
        <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onNoThanks} disabled={disabled}>No Thanks</button>
      </div>
    </div>
  );
}
