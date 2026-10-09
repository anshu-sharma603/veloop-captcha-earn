import { Check } from 'lucide-react';
import s from './captcha.module.css';

export default function CaptchaOption({ value, index, selected, locked, onSelect }) {
  const cls = [s.option, selected ? s.optionSelected : '', locked && !selected ? s.optionDim : ''].join(' ');
  return (
    <button type="button" className={cls} style={{ '--i': index }} disabled={locked} aria-pressed={selected} aria-label={`Option ${index + 1}: ${[...value].join(' ')}`} onClick={() => onSelect(value)}>
      {value}
      {selected && <><span className={s.scan} aria-hidden="true" /><span className={s.badge} aria-hidden="true"><Check size={12} strokeWidth={3.5} /></span></>}
    </button>
  );
}
