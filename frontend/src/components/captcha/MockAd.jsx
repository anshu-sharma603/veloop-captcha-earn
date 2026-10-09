import { Check } from 'lucide-react';
import GemIcon from '../common/GemIcon.jsx';
import { fmt, gemWord } from '../../utils/format.js';
import s from './captcha.module.css';

/** Demo-only stand-in for the future rewarded-ad step. No ad network is involved. */
export default function MockAd({ stage, claimed }) {
  if (stage === 'done' && claimed) {
    return (
      <div className={`${s.ad} ${s.done}`} role="status" aria-live="polite">
        <div className={s.doneIcon}><Check size={32} strokeWidth={3} /></div>
        <h3 style={{ margin: 0 }}>Reward completed</h3>
        <div className={s.amount} style={{ fontSize: '1.5rem' }}><GemIcon size={22} />+{claimed.reward.display} {gemWord(claimed.reward.amount)}</div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '.85rem' }}>New balance {fmt(claimed.balance.after.amount)}. Loading your next CAPTCHA…</p>
      </div>
    );
  }
  return (
    <div className={s.ad} role="status" aria-live="polite">
      {stage === 'preparing' || !claimed ? (
        <><div className={s.orbit} style={{ width: 120, height: 120 }} aria-hidden="true"><span className={`${s.ring} ${s.ring2}`} style={{ inset: 0 }} /><GemIcon size={40} /></div><h3 style={{ margin: 0 }}>Preparing reward...</h3></>
      ) : (
        <>
          <div className={s.adBox}><div><strong>Demo rewarded ad</strong><span>Development placeholder. No real advertisement.</span></div><i className={s.adProgress} /></div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '.85rem' }}>Your reward is being added to your account.</p>
        </>
      )}
    </div>
  );
}
