type StorageValue = string | number | boolean | object | null;

const STORAGE_PREFIX = "smashing-cats-";

function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function isLikelyJson(value: string): boolean {
  const trimmed = value.trim();

  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    (!Number.isNaN(Number(trimmed)) && trimmed !== "")
  );
}

export const storage = {
  get<T = string>(key: string): T | string | null {
    try {
      const value = localStorage.getItem(getStorageKey(key));

      if (value === null) {
        return null;
      }

      if (!isLikelyJson(value)) {
        return value;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value;
      }
    } catch {
      return null;
    }
  },

  set(key: string, value: StorageValue): void {
    try {
      const storageKey = getStorageKey(key);

      if (typeof value === "string") {
        localStorage.setItem(storageKey, value);

        return;
      }

      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(getStorageKey(key));
    } catch {
      // Ignore storage errors
    }
  },
};
