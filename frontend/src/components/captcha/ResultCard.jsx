import { ArrowRight, Check, RefreshCw, X } from 'lucide-react';
import GemIcon from '../common/GemIcon.jsx';
import ClaimButton from './ClaimButton.jsx';
import { useCountUp } from '../../hooks/useCountUp.js';
import { fmt, gemWord } from '../../utils/format.js';
import s from './captcha.module.css';

const makePieces = (colors) => Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2; const r = 62 + (i % 3) * 10;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, c: colors[i % colors.length] };
});
const GOOD = makePieces(['#2fd27a', '#38d5ff', '#f5b93b', '#7c5cff']);
const BAD = makePieces(['#f0455a', '#ff7a8a', '#c92a41', '#f5b93b']);

export default function ResultCard({ result, balance, onClaim, onNoThanks, disabled }) {
  const ok = result.result === 'CORRECT';
  const amount = result.reward.amount;
  const shown = useCountUp(amount);
  const tone = ok ? { '--tone': 'var(--green)', '--tone-deep': 'var(--green-deep)' } : { '--tone': 'var(--red)', '--tone-deep': 'var(--red-deep)' };
  const before = balance?.amount ?? 0;

  return (
    <div className={s.result} style={tone} role="status" aria-live="polite">
      <div className={s.medal}>
        <div className={s.confetti} aria-hidden="true">
          {(ok ? GOOD : BAD).map((p, i) => <i key={i} style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--c': p.c }} />)}
        </div>
        <div className={s.medalCircle}>{ok ? <Check size={46} strokeWidth={3} /> : <X size={46} strokeWidth={3} />}</div>
      </div>
      <h3>{ok ? 'Verification Complete!' : 'Verification Unsuccessful'}</h3>
      <p>{ok ? 'You earned' : "The selected code doesn't match the image shown. Please try again with a new challenge."}</p>
      <div className={s.amount}><GemIcon size={30} /><span>+{fmt(shown)} {gemWord(amount)}</span></div>
      <div className={s.balRow} aria-label="Balance preview">
        <div><b>{fmt(before)}</b><small>Previous Balance</small></div>
        <ArrowRight size={18} aria-hidden="true" />
        <div><b>{fmt(before + amount)}</b><small>New Balance</small></div>
      </div>
      <div className={s.actions}>
        <ClaimButton onClick={onClaim} disabled={disabled}>{ok ? 'Add to Balance' : 'Claim Reward'}</ClaimButton>
        <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onNoThanks} disabled={disabled}>
          {ok ? 'Maybe Later' : <><RefreshCw size={16} /> Get New Code</>}
        </button>
      </div>
      <p className={s.note} style={{ justifyContent: 'center', marginTop: 14 }}>
        {ok ? 'Tap Add to Balance to collect your reward.' : 'Security checks keep your account safe.'}
      </p>
    </div>
  );
}