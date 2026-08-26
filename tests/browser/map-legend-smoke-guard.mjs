const result = document.querySelector('#cgb-smoke-result');
const shouldCheckLegend = document.body.dataset.view === 'map' && document.body.dataset.commandSurface === 'map';

if (shouldCheckLegend) {
  const legend = document.querySelector('.map-legend');
  const stats = document.querySelector('.opening-stat');
  const labels = [...(legend?.querySelectorAll('.map-legend__item') || [])]
    .map((item) => item.textContent.trim());
  const legendStyle = legend ? getComputedStyle(legend) : null;
  const legendRect = legend?.getBoundingClientRect();
  const statsRect = stats?.getBoundingClientRect();

  const failures = [];
  if (!legend) failures.push('map legend is missing');
  if (!stats) failures.push('opening statistics are missing');
  if (labels.join('|') !== 'Watch Party|Cal Bar|Fan-Added') failures.push('map legend labels are incorrect');
  if (legend && (legendStyle?.display === 'none' || legendStyle?.visibility === 'hidden' || !legendRect?.width || !legendRect?.height)) {
    failures.push('map legend is not visibly rendered');
  }
  if (statsRect && statsRect.height < 70) failures.push('opening statistics did not expand for the legend row');
  if (legendRect && statsRect && (legendRect.top < statsRect.top || legendRect.bottom > statsRect.bottom + 1)) {
    failures.push('map legend is outside the statistics card');
  }

  if (failures.length && result) {
    const detail = document.createElement('pre');
    detail.id = 'cgb-map-legend-smoke-failure';
    detail.textContent = `CGB_MAP_LEGEND_FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`;
    result.replaceWith(detail);
  }
}
