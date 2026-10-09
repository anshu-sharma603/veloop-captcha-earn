import { Gift, Lock, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import s from './captcha.module.css';

const ITEMS = [
  [ShieldCheck, 'Secure', 'Every answer is checked on our servers.'],
  [Gift, 'Rewarding', 'Earn Gems for completing verification.'],
  [Zap, 'Fast', 'Quick verification and instant rewards.'],
  [Smartphone, 'Mobile first', 'Built for touch, tuned for every screen.'],
  [Lock, 'Trusted', 'Your balance can only change on the server.'],
];
export default function TrustList() {
  return (
    <ul className={s.trust}>
      {ITEMS.map(([Icon, t, d]) => (
        <li key={t}><div className={s.trustIcon}><Icon size={18} /></div><div><strong>{t}</strong><span>{d}</span></div></li>
      ))}
    </ul>
  );
}
