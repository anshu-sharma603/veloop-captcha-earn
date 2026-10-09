import { Lock } from 'lucide-react';
import s from './captcha.module.css';

export default function CheckingState() {
  return (
    <div className={s.checking} role="status" aria-live="polite">
      <div className={s.orbit} aria-hidden="true">
        <span className={`${s.ring} ${s.ring1}`} /><span className={`${s.ring} ${s.ring2}`} /><span className={`${s.ring} ${s.ring3}`} />
        <div className={s.lock}><Lock size={30} /></div>
      </div>
      <h3>Checking your answer...</h3>
      <p>Please wait while VELoop verifies your code.</p>
      <div className={s.bar} aria-hidden="true"><i /></div>
      <div className={s.note}>Do not close this screen while verification is in progress.</div>
    </div>
  );
}
