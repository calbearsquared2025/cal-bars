(() => {
  const MapClass = window.maplibregl?.Map;
  if (!MapClass || MapClass.prototype.__cgbSafeResizeInstalled) return;

  const originalResize = MapClass.prototype.resize;

  MapClass.prototype.resize = function safeResize(eventData) {
    const container = this.getContainer?.();
    const rect = container?.getBoundingClientRect?.();

    if (!rect || rect.width < 2 || rect.height < 2) {
      return this;
    }

    try {
      return originalResize.call(this, eventData);
    } catch (error) {
      if (/failed to invert matrix/i.test(String(error?.message || error))) {
        console.warn('Map resize deferred until the container has stable dimensions.');
        return this;
      }
      throw error;
    }
  };

  Object.defineProperty(MapClass.prototype, '__cgbSafeResizeInstalled', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
})();
