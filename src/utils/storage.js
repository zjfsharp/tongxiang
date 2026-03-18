const PREFIX = 'tongxiang_'

export function getData(key, fallback) {
  try {
    const stored = localStorage.getItem(PREFIX + key)
    if (stored) return JSON.parse(stored)
  } catch (_) {}
  return fallback
}

export function setData(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (_) {}
}

export function clearData(key) {
  localStorage.removeItem(PREFIX + key)
}

export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k))
}
