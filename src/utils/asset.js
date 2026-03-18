// Prepend Vite's base path to any asset path
// import.meta.env.BASE_URL = '/txyx/' in production, '/' in dev
export const asset = (path) =>
  import.meta.env.BASE_URL + path.replace(/^\//, '')
