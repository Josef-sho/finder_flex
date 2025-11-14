const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

if (!descriptor || typeof descriptor.get === 'function') {
  const storage = new Map();
  const stub = {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    key(index) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key) {
      storage.delete(key);
    },
    setItem(key, value) {
      storage.set(String(key), String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    writable: false,
    value: stub,
  });
}

require('react-scripts/scripts/start');

