const CGB_PERFORMANCE_PREFIX = 'cgb:';

function usablePerformance(candidate) {
  return candidate && typeof candidate === 'object' ? candidate : null;
}

export function markCgbPerformance(name, performanceObject = globalThis.performance) {
  const perf = usablePerformance(performanceObject);
  const entryName = String(name || '');
  if (!perf || typeof perf.mark !== 'function' || !entryName.startsWith(CGB_PERFORMANCE_PREFIX)) return false;
  try {
    perf.mark(entryName);
    return true;
  } catch (_) {
    return false;
  }
}

export function measureCgbPerformance(name, startMark, endMark, performanceObject = globalThis.performance) {
  const perf = usablePerformance(performanceObject);
  const entryName = String(name || '');
  if (!perf || typeof perf.measure !== 'function' || !entryName.startsWith(CGB_PERFORMANCE_PREFIX)) return false;
  try {
    perf.measure(entryName, startMark, endMark);
    return true;
  } catch (_) {
    return false;
  }
}

export function getCgbPerformanceEntries(performanceObject = globalThis.performance) {
  const perf = usablePerformance(performanceObject);
  if (!perf || typeof perf.getEntries !== 'function') return Object.freeze([]);
  try {
    return Object.freeze(perf.getEntries()
      .filter((entry) => String(entry?.name || '').startsWith(CGB_PERFORMANCE_PREFIX))
      .map((entry) => Object.freeze({
        name: String(entry.name),
        entryType: String(entry.entryType || ''),
        startTime: Number(entry.startTime) || 0,
        duration: Number(entry.duration) || 0
      })));
  } catch (_) {
    return Object.freeze([]);
  }
}

if (typeof window !== 'undefined' && !Object.prototype.hasOwnProperty.call(window, 'CGBPerformance')) {
  Object.defineProperty(window, 'CGBPerformance', {
    value: Object.freeze({ getEntries: () => getCgbPerformanceEntries() }),
    writable: false,
    configurable: false,
    enumerable: true
  });
}
