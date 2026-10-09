import { useState } from 'react';
import './landing.css';
 
// Change these to match your router paths
const LOGIN = '/login';
const SIGNUP = '/login';
 
const SIM = [
  ['🎬', 'Watch 5 Sponsor Video Ads', 'Quick 3-min video stream', 500],
  ['🔥', 'Claim Daily Streak Bonus', 'Consecutive check-in multiplier', 250],
  ['👥', 'Refer 1 Friend', '+10% lifetime earning bonus', 500],
  ['⛏️', '1-Hour Auto Cloud Mining', 'Passive background credit', 300],
];
const TRUST = [
  ['🔒', 'Secure Platform', '256-Bit Encrypted Vault'],
  ['⚡', 'Fast Withdrawals', 'Instant UPI & PayPal Payouts'],
  ['💳', 'Multiple Options', 'Cash, Vouchers & Gift Cards'],
  ['👥', 'Growing Community', 'Thousands Earning Daily'],
];
const STATS = [['< 2 Mins', 'Avg Payout Speed'], ['256-Bit', 'SSL Encryption'], ['10,000+', 'Veloopers*'], ['4.9 / 5.0', 'User Rating']];
// [group, tag, title, text, meta]  group: q=Daily & Quick, p=Passive, b=Bonus
const EARN = [
  ['q', 'Up to 300 Gems / ad', 'Watch Ads', 'Watch short video ads and sponsored clips from premium brand partners to earn instant Gems.', '3-5 mins'],
  ['b', '+500 Gems / friend', 'Referral Program', 'Invite friends and earn 10% lifetime commission on all Gems your referrals generate.', 'Uncapped'],
  ['q', 'Multiplier Bonus', 'Daily Streak', 'Check in daily to build streak multipliers. 7 consecutive days unlocks golden reward chests.', '24h Reset'],
  ['p', 'Automated Sessions', 'Mine & Earn', 'Activate background cloud sessions to mine Gems passively while you browse or sleep.', '1-Click Start'],
  ['p', 'Up to 18% APY', 'Stake & Earn', 'Lock your surplus Gems in reward vaults to earn daily yield compounding automatically.', 'Flexible Lock'],
  ['q', 'Micro Tasks', 'Tap & Earn', 'Interactive tap mini-games and quick survey ratings to collect instant micro-Gem drops.', 'Instant Drop'],
  ['p', 'App Activity Sync', 'Sync & Earn', 'Sync health steps, game time, or browser extensions to convert everyday activity to points.', 'Background'],
  ['b', 'Instant Coupon Drops', 'Promo Codes', 'Redeem promo codes dropped daily on our Telegram, Twitter, and email newsletter.', 'Community'],
  ['b', 'Jackpot up to 10k', 'Lucky Spins', 'Spin the daily fortune wheel for guaranteed prize rewards and mega multiplier boosts.', '1 Free Spin/Day'],
  ['b', 'Free Claim', 'Daily Bonus', 'Log in every morning to claim your no-strings-attached mystery Gem bonus box.', 'Instant Claim'],
  ['p', 'Level Progression', 'XP Rewards', 'Level up your Velooper profile with XP points to unlock higher payout tiers and VIP perks.', 'Tier Badges'],
];
const TABS = [['all', 'All Channels (11)'], ['q', '⚡ Daily & Quick'], ['p', '💎 Passive Earning'], ['b', '🎁 Bonus & Offers']];
const PAY = [
  ['Instant Transfer', 'Direct UPI Payout', 'Instant cash transfers to Google Pay, PhonePe, Paytm, or any BHIM UPI handle.', 'Min. Payout: 100 Gems'],
  ['< 2 Hours', 'Amazon Gift Card', 'Digital voucher codes delivered straight to your registered email address.', 'Min. Payout: $1.00'],
  ['Instant Code', 'Google Play Code', 'Redeem for apps, games, movies, and in-app purchases on Android devices.', 'Min. Payout: $1.00'],
  ['Global Cash', 'PayPal Cash', 'Global cash payouts directly to your verified PayPal email account.', 'Min. Payout: $5.00'],
];
const STEPS = [
  ['Create Free Account', 'Sign up in 30 seconds with Google or email. Get a welcome bonus of 100 free Gems instantly upon confirmation.'],
  ['Earn Gems Daily', 'Choose activities from 11+ earning channels including ads, daily streaks, surveys, referrals, and passive mining.'],
  ['Redeem Real Cash', 'Convert Gems directly into UPI bank cash, PayPal, or brand vouchers. Receive funds instantly with zero transaction fee.'],
];
const FLOW = [['Complete Activities', 'Watch ads or complete surveys'], ['Earn Gems', 'Points credit to wallet balance'], ['Choose Method', 'Select UPI, PayPal or Voucher'], ['Receive Reward', 'Instant delivery to your account']];
const WHY = [
  ['Instant Payout Engine', 'Withdrawals are processed programmatically within minutes directly to your account.'],
  ['Verified Bank Security', 'Enterprise-grade encryption protecting user balances, credentials, and payout data.'],
  ['11+ Diverse Earning Streams', 'From passive cloud mining to quick ad streaks, earn on your own terms anytime.'],
  ['Transparent Real-Time Tracking', 'Live dashboard analytics showing every Gem earned, pending credit, and payout receipt.'],
  ['Zero Hidden Fees', '100% of your earned Gems convert directly into full value cash without redemption deductions.'],
  ['Dedicated 24/7 Support', 'Helpful customer support team available via live chat and email to resolve queries.'],
];
const ROAD = [
  ['Phase 1: Multi-Currency Cashouts', 'UPI, PayPal, and Gift Cards live across global markets.'],
  ['Phase 2: Mobile App Ecosystem', 'Native Android & iOS apps coming with one-tap mining widgets.'],
  ['Phase 3: Creator & Merchant API', 'Enabling merchants to drop instant promo Gems directly to customers.'],
];
const REV = [
  ['RD', 'Rohan Das', '₹1,500+ Redeemed', 'I redeemed ₹1,500 via UPI on my very second day! Watching ad streams during breaks is super seamless.'],
  ['PS', 'Priya Sharma', '$35 Amazon Voucher', 'The daily streak multipliers are addictive. Reached level 4 and already claimed 3 Amazon Gift Cards!'],
  ['AK', 'Aman Kumar', '18,500 Gems Mined', 'Mine & Earn lets me generate passive Gems on my laptop while I study. Super clean interface and fast support.'],
  ['SG', 'Sneha Gupta', '$120+ Cashout', 'Referred 12 college friends. The 10% lifetime referral bonus is legitimate money!'],
];
const FAQ = [
  ['What is VELOOP Rewards?', 'VELOOP Rewards is a modern rewards platform where users earn Gems by participating in digital activities like watching sponsored ad clips, completing surveys, maintaining daily streaks, and passive cloud mining. Earned points can be redeemed instantly for real cash via UPI, PayPal, or Gift Cards.'],
  ['How do I earn Gems?', 'You can earn Gems across 11 channels: Watch Ads, Referral Invites, Daily Streak Check-ins, Cloud Mine & Earn, Stake & Earn yield, Tap & Earn mini-games, Activity Sync, Promo Codes, Lucky Spins, Daily Bonus boxes, and XP Level Progression.'],
  ['How do withdrawals work?', 'Once you reach the minimum balance (e.g. 100 Gems = ₹10 / $1), select your cashout method (UPI, PayPal, Amazon, or Google Play), enter your payment handle or email, and confirm. Funds are processed programmatically.'],
  ['What are Gems?', 'Gems are VELOOP reward points. 100 Gems equal $1 USD (or equivalent INR). Gems never expire as long as your account remains active.'],
  ['How long do withdrawals take?', 'UPI transfers and Google Play codes are typically delivered in under 2 minutes. PayPal and Amazon codes process within 2 to 24 hours depending on security verification.'],
  ['How do referrals work?', 'Share your unique invite link. When a friend registers and completes their first activity, you earn 500 bonus Gems plus an ongoing 10% commission on their earnings.'],
  ['How do promo codes work?', 'Copy active promo codes from our social channels, paste them into the Promo Codes section on your dashboard, and click Redeem to instantly credit Gems.'],
];
const NAV = [['Ways to Earn', '#ways'], ['Withdrawals', '#withdrawals'], ['How it Works', '#how'], ['About', '#vision'], ['For Business', '#business'], ['FAQ', '#faq']];
 
const Head = ({ tag, title, sub }) => (
  <div className="vl-head">
    <span className="vl-pill">{tag}</span>
    <h2>{title}</h2>
    {sub && <p>{sub}</p>}
  </div>
);
 
export default function Landing() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [sel, setSel] = useState([true, true, true, false]);
  const total = SIM.reduce((s, r, i) => s + (sel[i] ? r[3] : 0), 0);
  const toggle = (i) => setSel(sel.map((v, k) => (k === i ? !v : v)));
 
  return (
    <div className="vl">
      <header className="vl-nav">
        <div className="vl-wrap vl-nav-in">
          <a href="#top" className="vl-logo">VELOOP<small>REWARDS</small></a>
          <nav className={`vl-links ${open ? 'on' : ''}`}>
            {NAV.map(([n, h]) => <a key={n} href={h} onClick={() => setOpen(false)}>{n}</a>)}
            <a className="vl-btn ghost vl-only-m" href={LOGIN}>Sign In</a>
            <a className="vl-btn gold vl-only-m" href={SIGNUP}>Get Started</a>
          </nav>
          <div className="vl-nav-cta">
            <a className="vl-btn ghost" href={LOGIN}>Sign In</a>
            <a className="vl-btn gold" href={SIGNUP}>Get Started</a>
          </div>
          <button className="vl-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>
      </header>
 
      <section id="top" className="vl-hero">
        <div className="vl-wrap vl-hero-grid">
          <div>
            <span className="vl-pill">Next-Gen Digital Rewards Platform · Gems 2.0</span>
            <h1>Turn Daily Screen Time Into Instant Cash Rewards.</h1>
            <p className="vl-lead">VELOOP Rewards is the trusted platform where digital activities earn you <b>Gems</b>, cashed out via UPI, PayPal, or Gift Cards.</p>
            <div className="vl-row">
              <a className="vl-btn gold lg" href={SIGNUP}>Start Earning Free</a>
              <a className="vl-btn ghost lg" href="#how">Know More About Us</a>
            </div>
            <div className="vl-stats">
              {STATS.map(([a, b]) => <div key={b}><b>{a}</b><span>{b}</span></div>)}
            </div>
            <small className="vl-note">*Illustrative community benchmark.</small>
          </div>
 
          <div className="vl-card vl-sim">
            <div className="vl-sim-top"><div><h3>Earnings Simulator</h3><p>Select activities to estimate instant cashout</p></div><span className="vl-chip">🔒 SSL 256-Bit</span></div>
            {SIM.map((r, i) => (
              <label key={r[1]} className={`vl-opt ${sel[i] ? 'on' : ''}`}>
                <input type="checkbox" checked={sel[i]} onChange={() => toggle(i)} />
                <span className="vl-ico">{r[0]}</span>
                <span className="vl-opt-t"><b>{r[1]}</b><small>{r[2]}</small></span>
                <em>+{r[3]} Gems</em>
              </label>
            ))}
            <div className="vl-total">
              <div><small>Estimated Instant Cashout</small><b>₹{(total / 10).toFixed(2)}</b> <span>{total.toLocaleString()} Gems</span></div>
              <span className="vl-chip ok">0% Fee Instant</span>
            </div>
            <a className="vl-btn gold block" href={SIGNUP}>Claim ₹{(total / 10).toFixed(2)} &amp; Start Earning Now</a>
          </div>
        </div>
        <div className="vl-wrap vl-trust">
          {TRUST.map(([i, t, s]) => <div key={t}><span className="vl-ico">{i}</span><div><b>{t}</b><small>{s}</small></div></div>)}
        </div>
      </section>
 
      <section id="ways" className="vl-sec">
        <div className="vl-wrap">
          <Head tag="11+ Earning Channels" title="Multiple Ways to Earn Gems Every Day" sub="Choose activities that fit your schedule. From quick video streams to passive mining, earning rewards has never been this engaging." />
          <div className="vl-tabs" role="tablist">
            {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
          </div>
          <div className="vl-grid g3">
            {EARN.filter((e) => tab === 'all' || e[0] === tab).map((e) => (
              <article key={e[2]} className="vl-card">
                <span className="vl-chip gold">{e[1]}</span>
                <h3>{e[2]}</h3><p>{e[3]}</p>
                <div className="vl-foot"><a href={SIGNUP}>Learn More</a><small>{e[4]}</small></div>
              </article>
            ))}
          </div>
        </div>
      </section>
 
      <section id="withdrawals" className="vl-sec alt">
        <div className="vl-wrap">
          <Head tag="Instant Cashout" title="Supported Withdrawal Methods" sub="Redeem your earned Gems directly to your preferred payment account. Zero hidden fees, instant settlements." />
          <div className="vl-grid g4">
            {PAY.map((p) => (
              <article key={p[1]} className="vl-card">
                <span className="vl-chip">{p[0]}</span>
                <h3>{p[1]}</h3><p>{p[2]}</p>
                <div className="vl-foot"><small>{p[3]}</small><span className="vl-chip ok">0% Fee</span></div>
              </article>
            ))}
          </div>
        </div>
      </section>
 
      <section id="how" className="vl-sec">
        <div className="vl-wrap">
          <Head tag="Simple 3-Step Process" title="How VELOOP Rewards Works" sub="Start earning real money in under two minutes with our effortless 3-step setup." />
          <div className="vl-grid g3">
            {STEPS.map((s, i) => <article key={s[0]} className="vl-card"><span className="vl-num">{i + 1}</span><h3>{s[0]}</h3><p>{s[1]}</p></article>)}
          </div>
          <h3 className="vl-sub">Seamless Withdrawal Flow</h3>
          <p className="vl-mut">End-to-end transparent processing from task completion to your bank account.</p>
          <ol className="vl-flow">
            {FLOW.map((f, i) => <li key={f[0]}><span>{i + 1}</span><b>{f[0]}</b><small>{f[1]}</small></li>)}
          </ol>
        </div>
      </section>
 
      <section className="vl-sec alt">
        <div className="vl-wrap">
          <Head tag="Built for Trust & Speed" title="Why Choose VELOOP Rewards?" sub="Designed with fintech-grade precision, bank security, and industry-leading payouts." />
          <div className="vl-grid g3">
            {WHY.map((w) => <article key={w[0]} className="vl-card"><h3>{w[0]}</h3><p>{w[1]}</p></article>)}
          </div>
        </div>
      </section>
 
      <section id="vision" className="vl-sec">
        <div className="vl-wrap vl-two">
          <div>
            <span className="vl-pill">Our Mission & Vision</span>
            <h2>Democratizing Digital Micro-Earnings Globally.</h2>
            <p className="vl-mut">At VELOOP Rewards, our vision is to build the world’s most transparent, rewarding, and user-centric digital engagement network. Every click, view, and interaction holds value, and we ensure that value flows directly back to our community.</p>
            <div className="vl-stats two"><div><b>100%</b><span>Verified Payout Honor</span></div><div><b>Instant</b><span>Automated Settlement</span></div></div>
          </div>
          <div className="vl-card">
            <h3>Roadmap Ahead</h3>
            <ul className="vl-road">{ROAD.map((r) => <li key={r[0]}><b>{r[0]}</b><p>{r[1]}</p></li>)}</ul>
          </div>
        </div>
      </section>
 
      <section className="vl-sec alt">
        <div className="vl-wrap">
          <Head tag="Verified User Stories" title="Here's What Veloopers Say" sub="Read real experiences from users cashing out Gems daily." />
          <div className="vl-grid g4">
            {REV.map((r) => (
              <article key={r[1]} className="vl-card">
                <div className="vl-star" aria-label="5 stars">★★★★★</div>
                <p>“{r[3]}”</p>
                <div className="vl-who"><span className="vl-av">{r[0]}</span><div><b>{r[1]}</b><small>{r[2]}</small></div></div>
              </article>
            ))}
          </div>
        </div>
      </section>
 
      <section id="business" className="vl-sec">
        <div className="vl-wrap">
          <div className="vl-card vl-biz">
            <div>
              <span className="vl-pill">For Brands & Advertisers</span>
              <h2>Grow Your User Acquisition with High-Intent VELOOP Campaigns</h2>
              <p className="vl-mut">Promote your apps, videos, products, and surveys to thousands of active, verified digital earners with performance-based CPV, CPA, and custom engagement campaigns.</p>
              <ul className="vl-ticks"><li><b>Targeted Advertising</b> High conversion video & survey drops</li><li><b>Brand Promotions</b> Custom promo codes & daily quests</li></ul>
            </div>
            <div className="vl-biz-box"><span className="vl-chip">Partner With Us</span><h3>Advertiser Portal</h3><p>Launch your first performance campaign in under 15 minutes.</p><a className="vl-btn gold block" href="#">Request Business Demo</a></div>
          </div>
        </div>
      </section>
 
      <section id="faq" className="vl-sec alt">
        <div className="vl-wrap narrow">
          <Head tag="Frequently Asked Questions" title="Got Questions? We Have Answers." sub="Everything you need to know about VELOOP Rewards." />
          {FAQ.map((f, i) => <details key={f[0]} className="vl-faq" open={i === 0}><summary>{f[0]}</summary><p>{f[1]}</p></details>)}
        </div>
      </section>
 
      <section className="vl-sec">
        <div className="vl-wrap">
          <div className="vl-cta">
            <span className="vl-pill">Start Earning Today</span>
            <h2>Ready to Turn Your Screen Time into Real Cash?</h2>
            <p>Join thousands of Veloopers cashing out daily. Signup takes 30 seconds.</p>
            <a className="vl-btn gold lg" href={SIGNUP}>Create Free Account</a>
          </div>
        </div>
      </section>
 
      <footer className="vl-foot-main">
        <div className="vl-wrap vl-fgrid">
          <div><a href="#top" className="vl-logo">VELOOP<small>REWARDS</small></a><p>The modern engagement platform turning everyday digital activity into instant cash rewards.</p></div>
          <div><h4>Quick Navigation</h4>{NAV.slice(0, 4).map(([n, h]) => <a key={n} href={h}>{n}</a>)}<a href="#faq">FAQ & Support</a></div>
          <div><h4>For Partners</h4><a href="#business">Advertise with Us</a><a href="#business">Brand Promotions</a><a href="#business">Partnership Opportunities</a><a href="#business">Contact Business Team</a></div>
          <div><h4>Support & Legal</h4><a href="#">Privacy Policy</a><a href="#">Terms & Conditions</a><a href="#">Cookie Settings</a><a href="#">Refund & Settlement Policy</a></div>
        </div>
        <div className="vl-wrap vl-copy">VELOOP Rewards © 2026 VELOOP Inc. All rights reserved.</div>
      </footer>
    </div>
  );
}
 
