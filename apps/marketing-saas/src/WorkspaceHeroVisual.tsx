import { useState } from 'react';
import type { OverviewEntry } from './overview.data';

// Presentation is fail-closed. The private asset endpoint still enforces source integrity
// and tenant authorization; this check never grants access or replaces server review.
export default function WorkspaceHeroVisual({ photo, projectId }: {
  photo?: OverviewEntry['thumbnail']; projectId?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const prefix = projectId ? `/api/projects/${encodeURIComponent(projectId)}/creative/assets/` : '';
  const eligible = photo?.role === 'business_photo' && prefix && photo.url.startsWith(prefix)
    && photo.url.slice(prefix.length).length > 0 && !photo.url.slice(prefix.length).includes('/');
  const showPhoto = eligible && photo && failedUrl !== photo.url;
  return <>
    {showPhoto ? <img src={photo.url} alt={photo.alt} onError={() => setFailedUrl(photo.url)}/> :
      <svg className="workspace-hero-illustration" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Abstrakte Markenillustration mit Papierkarten; kein Foto eines Unternehmens">
        <rect width="600" height="360" fill="#F0F3EC"/>
        <path d="M390 -60C240 10 350 130 240 220S300 440 650 400V-60Z" fill="#E1EACF"/>
        <circle cx="120" cy="95" r="88" fill="#D0EB8D"/>
        <circle cx="540" cy="310" r="135" fill="#C8BCEE"/>
        <g transform="translate(132 67) rotate(-12 95 116)">
          <rect width="190" height="232" rx="18" fill="#D5DFC9"/>
          <rect x="-5" y="-7" width="190" height="232" rx="18" fill="#FFFFFF" stroke="#CBD6C4"/>
          <path d="M24 42H120M24 65H150M24 88H136M24 111H154" stroke="#B8C8B1" strokeWidth="8" strokeLinecap="round"/>
        </g>
        <g transform="translate(296 58) rotate(10 96 118)">
          <rect x="5" y="8" width="190" height="232" rx="18" fill="#CEDBBF"/>
          <rect width="190" height="232" rx="18" fill="#162D2C"/>
          <rect x="24" y="27" width="48" height="48" rx="14" fill="#D0EB8D"/>
          <path d="m38 51 9 9 13-20" fill="none" stroke="#162D2C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25 105H139M25 128H160M25 151H118" stroke="#E9F0E1" strokeWidth="8" strokeLinecap="round"/>
          <rect x="24" y="182" width="91" height="22" rx="11" fill="#C8BCEE"/>
        </g>
        <path d="m84 230 8 23 23 8-23 8-8 23-8-23-23-8 23-8Z" fill="#162D2C"/>
      </svg>}
    <figcaption>{showPhoto ? 'Freigegebene eigene Bildquelle' : eligible && failedUrl === photo?.url ? 'Bild nicht verfügbar · Markenillustration' : 'Markenillustration · kein Unternehmensfoto'}</figcaption>
  </>;
}
