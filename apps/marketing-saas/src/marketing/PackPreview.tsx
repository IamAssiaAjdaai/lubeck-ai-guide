import { samplePack } from "./sample";
const pack = samplePack();
export default function PackPreview() {
  return (
    <div
      className="product-preview"
      aria-label="Marketing-Pack Vorschau mit fiktiven Beispieldaten"
    >
      <div className="preview-rail" aria-hidden="true">
        <span className="preview-logo">✦</span>
        <span>▣</span>
        <span className="selected">✦</span>
        <span>◷</span>
      </div>
      <div className="preview-content">
        <div className="preview-top">
          <span>DEIN MARKETING-PACK</span>
          <span className="m-badge">Fiktives Beispiel</span>
        </div>
        <h2>Eine Woche. Ein klares Ziel.</h2>
        <p>Glanz Büroservice · Mehr Anfragen · LinkedIn</p>
        <div className="preview-metrics">
          <span>
            <strong>7</strong> Tage mit Plan
          </span>
          <span>
            <strong>3</strong> editierbare Posts
          </span>
          <span>
            <strong>Du</strong> gibst den Ton an
          </span>
        </div>
        <div className="preview-days">
          {["MO", "DI", "MI", "DO", "FR", "SA", "SO"].map((day, i) => (
            <div key={day} className={i === 0 ? "selected" : ""}>
              <span>{day}</span>
              <strong>0{i + 1}</strong>
              <i aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="preview-post">
          <div className="preview-post-label">
            <span className="m-badge">POST 01 · LINKEDIN</span>
            <span>Entwurf zur Prüfung</span>
          </div>
          <h3>{pack.hooks[0]}</h3>
          <p>{pack.facts[0].statement}</p>
          <p>{pack.cta}</p>
          <div className="preview-source">
            ✓ Beispieldaten · Fakten im Beispiel bestätigt
          </div>
        </div>
        <div className="preview-bottom">
          <span>Version 1 · Nicht veröffentlicht</span>
          <a href="#beispiel">Im Beispiel bearbeiten ↗</a>
        </div>
      </div>
    </div>
  );
}
