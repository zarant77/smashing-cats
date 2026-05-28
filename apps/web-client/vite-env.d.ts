/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLED_VIEWS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
