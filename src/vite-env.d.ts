/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string
  readonly VITE_PAYWALL_BYPASS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
