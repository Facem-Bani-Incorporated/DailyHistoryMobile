// Stub for react-native-google-mobile-ads on web — not supported
const noop = () => {};
const noopComponent = () => null;

module.exports = function mobileAds() {
  return { initialize: () => Promise.resolve([]) };
};
module.exports.default = module.exports;

module.exports.BannerAd = noopComponent;
module.exports.BannerAdSize = { BANNER: 'BANNER', LARGE_BANNER: 'LARGE_BANNER' };
module.exports.InterstitialAd = { createForAdRequest: () => ({ load: noop, show: noop, addAdEventListener: () => noop }) };
module.exports.RewardedAd = { createForAdRequest: () => ({ load: noop, show: noop, addAdEventListener: () => noop }) };
module.exports.AdEventType = { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed', OPENED: 'opened' };
module.exports.RewardedAdEventType = { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' };
module.exports.TestIds = { BANNER: '', INTERSTITIAL: '', REWARDED: '' };
