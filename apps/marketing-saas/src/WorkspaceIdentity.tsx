// Scoped workspace presentation: the public landing and legal identity stay unchanged.
export const workspaceIdentity = Object.freeze({ name: 'Wirkfaden', status: 'Arbeitsname · Marketing Team' });
export default function WorkspaceIdentity({ linked=true }: { linked?: boolean }) {
  const content=<><span className="workspace-wordmark" aria-hidden="true">W.</span><span className="identity-copy"><strong>{workspaceIdentity.name}</strong><small>{workspaceIdentity.status}</small></span></>;
  return linked?<a href="/" className="product-identity" aria-label={`${workspaceIdentity.name} · Arbeitsname · Startseite`}>{content}</a>:<span className="product-identity">{content}</span>;
}
