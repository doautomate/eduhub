import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";

// Node 22+'s built-in `localStorage` global shadows jsdom's own implementation and
// requires an explicit --localstorage-file flag, which throws/returns undefined in
// this test environment. Install a minimal in-memory Storage polyfill so any code
// under test (e.g. ThemeProvider) can use window.localStorage/localStorage normally.
if (typeof window !== "undefined" && (!window.localStorage || typeof window.localStorage.getItem !== "function")) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(window, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
