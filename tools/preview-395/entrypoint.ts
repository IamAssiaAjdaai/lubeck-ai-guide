import original from '../../src/cloudflare/entrypoint';
import { createPreviewFetch } from './guard.mjs';

// No scheduled export: erasure/cron cannot run through this entrypoint.
const preview = { fetch: createPreviewFetch(original.fetch.bind(original)) };
export default preview;
