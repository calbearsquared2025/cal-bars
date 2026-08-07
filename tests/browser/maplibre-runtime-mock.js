(() => {
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
    constructor() {
      this.handlers = new globalThis.Map();
      this.center = { lng: -98.5795, lat: 39.8283 };
      this.zoom = 3.2;
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

    addControl() {
      return this;
    }

    resize() {
      return this;
    }

    remove() {}

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
    setLngLat() {
      return this;
    }

    addTo() {
      return this;
    }

    remove() {}
  }

  window.maplibregl = {
    Map: MapMock,
    Marker: MarkerMock,
    LngLatBounds: LngLatBoundsMock,
    NavigationControl: class NavigationControlMock {},
    AttributionControl: class AttributionControlMock {}
  };
})();
