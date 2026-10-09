import GemIcon from '../common/GemIcon.jsx';
import { gemWord } from '../../utils/format.js';
import s from './captcha.module.css';

// Reward amounts are rendered from GET /captcha/config, never hard-coded in React.
export default function RewardCard({ config }) {
  if (!config) return null;
  const c = config.correctReward; const w = config.wrongReward;
  return (
    <div className={s.reward}>
      <GemIcon size={26} />
      <div>
        Complete verification to earn <b>+{c.display} {gemWord(c.amount)}</b>
        <small>A wrong answer still earns +{w.display} {gemWord(w.amount)}</small>
      </div>
    </div>
  );
}
