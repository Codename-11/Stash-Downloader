/**
 * Local storage utilities
 */

/**
 * Get item from localStorage with type safety
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage
 */
export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
}

/**
 * Clear all plugin data from localStorage
 */
export function clearPluginStorage(prefix: string): void {
  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(prefix)
    );
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing plugin storage:', error);
  }
}
