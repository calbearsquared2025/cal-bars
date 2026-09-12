import { markCgbPerformance, measureCgbPerformance } from './performance.mjs';

let loadPromise = null;
let loaded = false;

export function ensureMyCgbFeaturesLoaded() {
  if (loadPromise) return loadPromise;

  markCgbPerformance('cgb:my-cgb-features:load:start');
  const providers = Promise.all([
    import('./account-history.mjs'),
    import('./account-deletion.mjs')
  ]);

  loadPromise = providers
    .then(() => import('./my-cgb-render-controller.mjs'))
    .then(() => {
      loaded = true;
      markCgbPerformance('cgb:my-cgb-features:load:ready');
      measureCgbPerformance(
        'cgb:my-cgb-features:load',
        'cgb:my-cgb-features:load:start',
        'cgb:my-cgb-features:load:ready'
      );
      return true;
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

export function myCgbFeaturesLoaded() {
  return loaded;
}

window.CGBMyCgbFeatureLoader = Object.freeze({
  load: ensureMyCgbFeaturesLoaded,
  isLoaded: myCgbFeaturesLoaded
});
