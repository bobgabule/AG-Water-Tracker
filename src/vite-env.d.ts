/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_POWERSYNC_URL: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_GPS_RANGE_METERS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
