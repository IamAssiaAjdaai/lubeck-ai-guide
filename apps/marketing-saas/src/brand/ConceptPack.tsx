import { useState } from "react";
import PackSectionNav, { type PackSection } from "../PackSectionNav";
import { samplePack, packMarkdown, downloadText } from "../marketing/sample";
const fixture = samplePack();
export default function ConceptPack({
  prefix,
  compact = false,
}: {
  prefix: string;
  compact?: boolean;
}) {
  const [section, setSection] = useState<PackSection>("posts"),
    [post, setPost] = useState(0),
    [pack, setPack] = useState(fixture),
    [reviewed, setReviewed] = useState(false),
    [notice, setNotice] = useState("");
  function resetReview() {
    setReviewed(false);
    setNotice("");
  }
  return (
    <div
      role="group"
      className={`concept-pack${compact ? " cp-compact" : ""}`}
      aria-label="Marketing-Pack mit synthetischen Beispieldaten"
    >
      <div className="cp-top">
        <span>
          GLANZ BÜROSERVICE <small>Fiktives Beispiel</small>
        </span>
        <span className="cp-status">Entwurf · de-DE</span>
      </div>
      <div className="cp-title">
        <h2>
          {compact ? (
            "Dein 7-Tage-Marketing-Pack."
          ) : (
            <>
              Deine nächste Woche.
              <br />
              Mit einem klaren Ziel.
            </>
          )}
        </h2>
        <span className="cp-seal">
          7<span>TAGE</span>
        </span>
      </div>
      <p className="cp-goal">
        Ziel: Mehr Anfragen · LinkedIn · manuell veröffentlichen
      </p>
      <PackSectionNav prefix={prefix} value={section} onChange={setSection} />
      <div
        role="tabpanel"
        className="pack-tab-panel"
        id={`${prefix}-posts`}
        aria-labelledby={`${prefix}-tab-posts`}
        hidden={section !== "posts"}
      >
        <div
          className="cp-post-choices"
          role="group"
          aria-label="Beitrag wählen"
        >
          {pack.posts.map((_, i) => (
            <button
              type="button"
              key={i}
              aria-pressed={post === i}
              onClick={() => setPost(i)}
            >
              Post 0{i + 1}
            </button>
          ))}
        </div>
        <label className="cp-editor">
          Beitrag {post + 1}
          <textarea
            value={pack.posts[post].text}
            maxLength={3000}
            rows={compact ? 4 : 7}
            onChange={(e) => {
              setPack({
                ...pack,
                editorialStatus: "human_edited",
                posts: pack.posts.map((p, i) =>
                  post === i ? { ...p, text: e.target.value } : p,
                ),
              });
              resetReview();
            }}
          />
        </label>
        <div className="cp-reference">
          ↳ Ursprung: {pack.posts[post].factIds.join(", ")} · im Beispiel
          bestätigt
        </div>
      </div>
      <div
        role="tabpanel"
        className="pack-tab-panel"
        id={`${prefix}-hooks`}
        aria-labelledby={`${prefix}-tab-hooks`}
        hidden={section !== "hooks"}
      >
        {pack.hooks.map((h, i) => (
          <label key={i} className="cp-editor">
            Hook {i + 1}
            <input
              value={h}
              maxLength={300}
              onChange={(e) => {
                setPack({
                  ...pack,
                  editorialStatus: "human_edited",
                  hooks: pack.hooks.map((v, n) =>
                    n === i ? e.target.value : v,
                  ),
                });
                resetReview();
              }}
            />
          </label>
        ))}
        <label className="cp-editor">
          Handlungsaufforderung
          <textarea
            value={pack.cta}
            maxLength={500}
            onChange={(e) => {
              setPack({
                ...pack,
                editorialStatus: "human_edited",
                cta: e.target.value,
              });
              resetReview();
            }}
          />
        </label>
      </div>
      <div
        role="tabpanel"
        className="pack-tab-panel"
        id={`${prefix}-plan`}
        aria-labelledby={`${prefix}-tab-plan`}
        hidden={section !== "plan"}
      >
        <ol className="cp-plan">
          {pack.days.map((d) => (
            <li key={d.day}>
              <strong>Tag {d.day}</strong>
              <span>{d.task}</span>
            </li>
          ))}
        </ol>
        <p className="cp-note">
          Zeitangaben im Export sind Vorschläge, keine terminierten Posts.
        </p>
      </div>
      <div
        role="tabpanel"
        className="pack-tab-panel"
        id={`${prefix}-export`}
        aria-labelledby={`${prefix}-tab-export`}
        hidden={section !== "export"}
      >
        <h3>Dein letzter Blick. Dein Export.</h3>
        <p>
          Manuelle Änderungen sind nicht automatisch faktengeprüft. Prüfe deinen
          Entwurf, bevor du ihn selbst veröffentlichst.
        </p>
        <label className="cp-check">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          Ich habe den Beispielentwurf geprüft.
        </label>
        <button
          className="bc-button"
          disabled={
            !reviewed ||
            pack.posts.some((p) => !p.text.trim()) ||
            pack.hooks.some((h) => !h.trim()) ||
            !pack.cta.trim()
          }
          onClick={() => {
            downloadText(
              "FIKTIVES DESIGNBEISPIEL · Provisorische Identität, keine echte Firma.\n\n" +
                packMarkdown(pack, "demo", "brand-concept", 1),
            );
            setNotice("Beispiel exportiert. Es wurde nichts veröffentlicht.");
          }}
        >
          Beispiel als Markdown herunterladen ↓
        </button>
      </div>
      <p className="cp-note">
        Feste Demo · keine echte KI · Änderungen nur bis zum Neuladen.
        Gespeicherte Versionen findest du im bestehenden Arbeitsbereich.
      </p>
      <p className="cp-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
