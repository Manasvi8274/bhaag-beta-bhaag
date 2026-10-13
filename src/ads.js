// Rewarded ads via @capacitor-community/admob (Android app only; on the web `available` is false).
// Live AdMob IDs (App ID is in android/app/src/main/res/values/strings.xml). To test without risking the account,
// add your phone under AdMob > Settings > Test devices, or set testing: true (Google test ads).
export const AD_CONFIG = {
  rewardedId: 'ca-app-pub-5362485112066096/2182558124', // "Escape Papa" rewarded unit
  testing: false,
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

// Web/PWA rewarded ads via Google H5 Games Ads (AdSense Ad Placement API). Needs the site approved in AdSense
// with H5 games ads enabled; until then no ad fills and showRewarded resolves false. Add ?adtest to the URL for test ads.
export const WEB_AD_CONFIG = {
  client: 'ca-pub-5362485112066096',
  test: /[?&]adtest\b/.test(globalThis.location?.search || ''),
};

export function createWebAds(config = WEB_AD_CONFIG, w = globalThis) {
  let loaded = null;
  const available = !!w.document && !!(config.enabled || config.test);

  function preload() {
    if (!available) return Promise.resolve(false);
    loaded ??= new Promise((resolve) => {
      w.adsbygoogle = w.adsbygoogle || [];
      w.adBreak = w.adConfig = (o) => w.adsbygoogle.push(o);
      const s = w.document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.client}`;
      if (config.test) s.setAttribute('data-adbreak-test', 'on');
      s.onload = () => { w.adConfig({ preloadAdBreaks: 'on', sound: 'on' }); resolve(true); };
      s.onerror = () => { loaded = null; resolve(false); }; // offline or blocked by an ad blocker: retry next time
      w.document.head.append(s);
    });
    return loaded;
  }

  // Resolves true only if the ad was watched to the reward. Never throws.
  async function showRewarded() {
    if (!(await preload())) return false;
    return new Promise((resolve) => {
      let earned = false, done = false;
      const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
      const timer = setTimeout(() => finish(false), 10000); // no ad started in time
      try {
        w.adBreak({
          type: 'reward', name: 'escape-papa',
          beforeReward: (showAdFn) => { clearTimeout(timer); showAdFn(); }, // the player already opted in by tapping
          adViewed: () => { earned = true; },
          adDismissed: () => { earned = false; },
          adBreakDone: () => finish(earned),
        });
      } catch { finish(false); }
    });
  }

  return { available, preload, showRewarded };
}
