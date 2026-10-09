/**
 * Gems are stored as INTEGER milli-gems (1 Gem = 1000). 0.5 Gem = 500.
 * Integer arithmetic means $inc on the wallet is exact: no 0.1 + 0.2 style drift.
 * Only the API boundary converts to a human number.
 */
const SCALE = 1000;

const toGems = (milli) => milli / SCALE;

// 125500 -> "125.50", 1000 -> "1.00", 125 -> "0.125"
function formatGems(milli) {
  return (milli / SCALE).toFixed(3).replace(/0$/, '');
}

const money = (milli) => ({ currency: 'GEMS', amount: toGems(milli), display: formatGems(milli) });

module.exports = { SCALE, toGems, formatGems, money };
