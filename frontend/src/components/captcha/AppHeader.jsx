import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import GemIcon from '../common/GemIcon.jsx';
import { fmt } from '../../utils/format.js';
import s from './captcha.module.css';

export default function AppHeader({ balance, onLogout }) {
  const [bump, setBump] = useState(false);
  const prev = useRef(balance?.amount);
  useEffect(() => {
    if (prev.current !== undefined && balance && prev.current !== balance.amount) {
      setBump(true); const t = setTimeout(() => setBump(false), 600); prev.current = balance.amount; return () => clearTimeout(t);
    }
    prev.current = balance?.amount; return undefined;
  }, [balance]);

  return (
    <header className={s.header}>
      <button type="button" className={s.iconBtn} onClick={onLogout} aria-label="Log out"><LogOut size={18} /></button>
      <div className={s.brand}><b>VELOOP</b><small>REWARDS</small></div>
      <div className={`${s.pill} ${bump ? s.pillBump : ''}`} aria-label={`Gem balance ${balance ? balance.display : 'loading'}`}>
        <GemIcon size={16} /><span>{balance ? fmt(balance.amount) : '—'}</span>
      </div>
    </header>
  );
}
