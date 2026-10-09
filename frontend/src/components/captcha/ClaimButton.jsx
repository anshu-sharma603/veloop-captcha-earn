import s from './captcha.module.css';

export default function ClaimButton({ onClick, disabled, children = 'Claim' }) {
  return <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
