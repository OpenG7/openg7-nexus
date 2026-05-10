type GlobalWithIntersectionObserver = typeof globalThis & {
  IntersectionObserver?: typeof IntersectionObserver;
};

const globalWithIO = globalThis as GlobalWithIntersectionObserver;

if (typeof globalWithIO.IntersectionObserver === 'undefined') {
  globalWithIO.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [] as number[];

    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
      void _callback;
      void _options;
    }

    observe(_target: Element): void {
      void _target;
    }

    unobserve(_target: Element): void {
      void _target;
    }

    disconnect(): void {
      return;
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}
