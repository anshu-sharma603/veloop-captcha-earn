import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCaptchaFlow } from '../../hooks/useCaptchaFlow.js';
import AppHeader from '../../components/captcha/AppHeader.jsx';
import CaptchaChallenge from '../../components/captcha/CaptchaChallenge.jsx';
import CaptchaOption from '../../components/captcha/CaptchaOption.jsx';
import RewardCard from '../../components/captcha/RewardCard.jsx';
import CheckingState from '../../components/captcha/CheckingState.jsx';
import ResultCard from '../../components/captcha/ResultCard.jsx';
import MockAd from '../../components/captcha/MockAd.jsx';
import ErrorState from '../../components/captcha/ErrorState.jsx';
import HistoryPanel from '../../components/captcha/HistoryPanel.jsx';
import TrustList from '../../components/captcha/TrustList.jsx';
import s from '../../components/captcha/captcha.module.css';

export default function CaptchaEarn() {
  const { logout } = useAuth();
  const f = useCaptchaFlow();
  const locked = f.phase !== 'challenge';

  let body;
  if (f.phase === 'loading') {
    body = <div aria-busy="true" aria-label="Loading CAPTCHA"><div className={s.skel} /><div className={s.skelGrid}><div /><div /><div /><div /></div></div>;
  } else if (f.phase === 'error') {
    body = <ErrorState message={f.error} onRetry={f.retry} />;
  } else if (f.phase === 'checking') {
    body = <CheckingState />;
  } else if (f.phase === 'result' && f.result) {
    body = <ResultCard result={f.result} balance={f.balance} onClaim={f.claim} onNoThanks={f.noThanks} />;
  } else if (f.phase === 'claiming') {
    body = <MockAd stage={f.adStage} claimed={f.claimed} />;
  } else if (f.challenge) {
    body = (
      <>
        <h1 className={s.title}>Earn <em>Gems</em></h1>
        <p className={s.lede}>Complete a quick security check to earn rewards.</p>
        {f.notice && <div className={s.notice} role="status"><span>{f.notice}</span><button type="button" onClick={f.dismissNotice}>Dismiss</button></div>}
        <CaptchaChallenge challenge={f.challenge} locked={locked} onNewCode={f.newCode} onExpire={f.newCode} />
        <p className={s.prompt}>Select the matching code</p>
        <div className={s.grid} role="group" aria-label="Answer options">
          {f.challenge.options.map((o, i) => (
            <CaptchaOption key={`${f.challenge.challengeId}-${o}`} value={o} index={i} selected={f.selected === o} locked={locked} onSelect={f.select} />
          ))}
        </div>
        <RewardCard config={f.config} />
        <div className={s.note}><ShieldCheck size={18} /><span>This helps protect your account from automated access.</span></div>
      </>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.layout}>
        <aside className={s.intro}>
          <h2 className={s.introTitle}>Secure verification. Real rewards.</h2>
          <p className={s.introSub}>Solve a short code check and earn Gems. Results and balances are always confirmed on VELoop's servers.</p>
          <TrustList />
        </aside>
        <div>
          <main className={s.card}>
            <AppHeader balance={f.balance} onLogout={logout} />
            {body}
          </main>
          <HistoryPanel refreshKey={f.historyKey} />
        </div>
      </div>
    </div>
  );
}
