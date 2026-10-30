export interface PreviewProfile {
  worker: string;
  origin: string;
  hyperdriveId: string;
  databaseHost: string;
  databaseName: string;
  mediaBucket: string;
}
export function previewConfig(profile: PreviewProfile): import('cf/config').CloudflareConfig;
