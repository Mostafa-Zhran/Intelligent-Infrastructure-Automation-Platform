/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly Backend_API?: string;
  readonly BACKEND_API?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
