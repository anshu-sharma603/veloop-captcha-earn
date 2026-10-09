import { WifiOff } from 'lucide-react';
import s from './captcha.module.css';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className={s.errorBox} role="alert">
      <WifiOff size={34} color="var(--red)" />
      <h3>We couldn't load your CAPTCHA</h3>
      <p>{message}</p>
      <button type="button" className={`${s.btn} ${s.btnPrimary}`} style={{ '--tone': 'var(--violet)', '--tone-deep': 'var(--violet-deep)', color: '#fff', padding: '0 28px' }} onClick={onRetry}>Try again</button>
    </div>
  );
}
