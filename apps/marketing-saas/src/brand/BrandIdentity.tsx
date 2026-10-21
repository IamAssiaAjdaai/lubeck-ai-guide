import { brandIdentity } from "./identity";
export function BrandMark() {
  return (
    <svg
      className="brand-symbol"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 10v14c0 8 11 8 11 0V15c0-8 10-8 10 0v10c0 8 10 8 10 0V10"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="8" r="3" fill="currentColor" />
    </svg>
  );
}
export default function BrandIdentity({ linked = true }: { linked?: boolean }) {
  const contents = (
    <>
      <BrandMark />
      <span className="identity-copy">
        <strong>{brandIdentity.name}</strong>
        <small>{brandIdentity.status}</small>
      </span>
    </>
  );
  return linked ? (
    <a
      className="product-identity"
      href="/"
      aria-label={`${brandIdentity.name} Startseite`}
    >
      {contents}
    </a>
  ) : (
    <span className="product-identity">{contents}</span>
  );
}
