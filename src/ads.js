// Rewarded ads via @capacitor-community/admob (Android app only; on the web `available` is false).
// BEFORE RELEASE: replace rewardedId with your own AdMob ad unit, set testing: false, and put your
// AdMob App ID in android/app/src/main/res/values/strings.xml (admob_app_id). Until then Google's test ads show.
export const AD_CONFIG = {
  rewardedId: 'ca-app-pub-3940256099942544/5224354917', // Google's official TEST rewarded unit
  testing: true,
};

const EV = { rewarded: 'onRewardedVideoAdReward', dismissed: 'onRewardedVideoAdDismissed', failedToShow: 'onRewardedVideoAdFailedToShow' };

export function createAds(plugin = globalThis.Capacitor?.Plugins?.AdMob, config = AD_CONFIG) {
  let inited = null, loading = null, ready = false;

  function init() {
    inited ??= (async () => {
      await plugin.initialize({ initializeForTesting: config.testing, maxAdContentRating: 'ParentalGuidance' });
      try { // GDPR/UMP consent: only shows a form where the law requires it (e.g. EU)
        const info = await plugin.requestConsentInfo();
        if (info.status === 'REQUIRED' && info.isConsentFormAvailable) await plugin.showConsentForm();
      } catch { /* consent service unavailable: ads may be non-personalised or not load */ }
    })().catch((e) => { inited = null; throw e; }); // retry init next time if the SDK failed to start
    return inited;
  }

  function preload() {
    if (!plugin || ready) return Promise.resolve();
    loading ??= (async () => {
      await init();
      await plugin.prepareRewardVideoAd({ adId: config.rewardedId, isTesting: config.testing, immersiveMode: true });
      ready = true;
    })().catch(() => { ready = false; }).finally(() => { loading = null; });
    return loading;
  }

  // Resolves true only if the player watched long enough to earn the reward. Never throws.
  async function showRewarded() {
    if (!plugin) return false;
    try {
      if (!ready) await preload();
      if (!ready) return false;
      ready = false;
      const earned = await new Promise((resolve) => {
        let rewarded = false, settled = false;
        const handles = [];
        const finish = (v) => {
          if (settled) return;
          settled = true;
          handles.forEach((h) => h.remove?.());
          resolve(v);
        };
        Promise.all([
          plugin.addListener(EV.rewarded, () => { rewarded = true; }),
          // the reward callback can land just after the dismiss on some devices
          plugin.addListener(EV.dismissed, () => setTimeout(() => finish(rewarded), 300)),
          plugin.addListener(EV.failedToShow, () => finish(false)),
        ]).then((hs) => {
          handles.push(...hs);
          if (settled) hs.forEach((h) => h.remove?.());
          return plugin.showRewardVideoAd();
        }).then((item) => { if (item?.amount > 0) rewarded = true; }, () => finish(false));
      });
      preload(); // get the next one ready
      return earned;
    } catch {
      return false;
    }
  }

  return { available: !!plugin, preload, showRewarded };
}
