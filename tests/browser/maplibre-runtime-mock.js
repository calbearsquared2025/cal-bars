(() => {
  const maps = [];
  const markers = [];

  class LngLatBoundsMock {
    constructor() {
      this.points = [];
    }

    extend(point) {
      this.points.push(point);
      return this;
    }

    isEmpty() {
      return this.points.length === 0;
    }
  }

  class MapMock {
    constructor(options = {}) {
      this.options = options;
      this.handlers = new globalThis.Map();
      const center = options.center || [-98.5795, 39.8283];
      this.center = {
        lng: Number(center?.lng ?? center?.[0] ?? -98.5795),
        lat: Number(center?.lat ?? center?.[1] ?? 39.8283)
      };
      this.zoom = Number.isFinite(options.zoom) ? options.zoom : 3.2;
      this.controls = [];
      this.removed = false;
      maps.push(this);
      queueMicrotask(() => this.emit('load'));
    }

    on(name, handler) {
      const handlers = this.handlers.get(name) || [];
      handlers.push(handler);
      this.handlers.set(name, handlers);
      return this;
    }

    emit(name, value = {}) {
      (this.handlers.get(name) || []).forEach((handler) => handler(value));
    }

    loaded() {
      return true;
    }

    fitBounds() {
      return this;
    }

    addControl(control) {
      this.controls.push(control);
      return this;
    }

    resize() {
      return this;
    }

    remove() {
      this.removed = true;
    }

    getStyle() {
      return { sources: {} };
    }

    getZoom() {
      return this.zoom;
    }

    getCenter() {
      return this.center;
    }

    project(value) {
      return {
        x: Number(value?.lng ?? value?.[0] ?? 0),
        y: Number(value?.lat ?? value?.[1] ?? 0)
      };
    }

    unproject(value) {
      return {
        lng: Number(value?.[0] ?? value?.x ?? 0),
        lat: Number(value?.[1] ?? value?.y ?? 0)
      };
    }

    easeTo(options = {}) {
      if (options.center) {
        this.center = {
          lng: Number(options.center.lng ?? options.center[0]),
          lat: Number(options.center.lat ?? options.center[1])
        };
      }
      if (Number.isFinite(options.zoom)) this.zoom = options.zoom;
      return this;
    }
  }

  class MarkerMock {
    constructor(options = {}) {
      this.options = options;
      this.lngLat = null;
      this.map = null;
      this.removed = false;
      markers.push(this);
    }

    setLngLat(value) {
      this.lngLat = value;
      return this;
    }

    addTo(map) {
      this.map = map;
      return this;
    }

    remove() {
      this.removed = true;
    }
  }

  window.CGBMapLibreRuntimeMock = Object.freeze({ maps, markers });
  window.maptilersdk = {
    config: { apiKey: '', session: true },
    Map: MapMock,
    Marker: MarkerMock,
    LngLatBounds: LngLatBoundsMock,
    NavigationControl: class NavigationControlMock {},
    AttributionControl: class AttributionControlMock {}
  };
})();
