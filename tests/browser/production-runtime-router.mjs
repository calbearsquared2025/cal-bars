const mode = new URLSearchParams(location.search).get('__cgb_harness') || 'main';

if (mode === 'direct' || mode === 'desktop-direct') {
  await import('./venue-detail-runtime-harness.mjs');
} else {
  await import('./production-runtime-harness.mjs');
}
