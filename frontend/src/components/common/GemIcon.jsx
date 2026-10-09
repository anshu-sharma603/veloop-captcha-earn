import { useId } from 'react';

export default function GemIcon({ size = 18 }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#E8A317" />
        </linearGradient>
      </defs>
      <path d="M16 2l11 8-11 20L5 10z" fill={`url(#${id})`} />
      <path d="M5 10h22M16 2l-5 8 5 20 5-20z" fill="none" stroke="#7A4E00" strokeOpacity=".35" />
    </svg>
  );
}
