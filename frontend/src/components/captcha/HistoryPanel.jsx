import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { captchaService } from '../../services/captchaService.js';
import s from './captcha.module.css';

export default function HistoryPanel({ refreshKey }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!open) return;
    captchaService.history(1, 5).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [open, refreshKey]);

  return (
    <section className={s.history}>
      <button type="button" className={s.historyHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Recent activity {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (items === null ? <p className={s.empty}>Loading…</p> : items.length === 0 ? <p className={s.empty}>Solve your first CAPTCHA to start earning Gems.</p> : (
        <ul className={s.rows}>
          {items.map((i) => (
            <li key={i.challengeId}>
              <div>{new Date(i.date).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<small>{i.rewardStatus === 'CLAIMED' ? 'Claimed' : i.rewardStatus === 'PENDING' ? 'Waiting to claim' : 'Not claimed'}</small></div>
              <span className={`${s.chip} ${i.result === 'CORRECT' ? s.chipOk : s.chipBad}`}>{i.result === 'CORRECT' ? 'CORRECT' : 'WRONG'}</span>
              <b>+{i.reward.display}</b>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}
