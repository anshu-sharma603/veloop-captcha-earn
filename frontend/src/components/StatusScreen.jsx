import './status.css';

export default function StatusScreen({ code, title, text, actions }) {
  return (
    <div className="st">
      <div className="st-glow" aria-hidden="true" />
      <div className="st-brand">VELOOP<small>REWARDS</small></div>
      <div className="st-code">{code}</div>
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="st-actions">{actions}</div>
    </div>
  );
}