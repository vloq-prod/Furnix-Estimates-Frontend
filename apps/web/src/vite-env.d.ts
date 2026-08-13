/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL of the estimates API, e.g. https://estimates-api.furnixcrm.com/api/v1
   * Leave unset in development — Vite proxies /api to the local server.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
