import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  blankIntake,
  validateProjectIntake,
  type ProjectIntake,
  type ProjectIntakeField,
  type ProjectKind,
  type IntakeValidation,
} from "./intake";

type Screen = "setup" | "dashboard";
type Stage = 0 | 1 | 2 | 3;

const kinds: { kind: ProjectKind; icon: string; title: string; help: string }[] = [
  { kind: "website", icon: "▣", title: "Website", help: "A website, online store, or SaaS" },
  { kind: "app", icon: "◈", title: "App", help: "A mobile or web application" },
  { kind: "local", icon: "⌖", title: "Local Business", help: "A shop, café, studio, or service" },
];

const steps = ["Project Type", "Your Business", "Analysis", "Confirm Facts"] as const;

function Field(props: {
  name: Exclude<ProjectIntakeField, "kind">;
  label: string;
  value: string;
  error?: string;
  helper?: string;
  full?: boolean;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const id = `business-${props.name}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const common = {
    id,
    name: props.name,
    value: props.value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => props.onChange(event.target.value),
    "aria-invalid": props.error ? true as const : undefined,
    "aria-describedby": [props.helper ? helpId : "", props.error ? errorId : ""].filter(Boolean).join(" ") || undefined,
    placeholder: props.placeholder,
    required: props.required,
    maxLength: props.name === "websiteUrl" ? 2048 : props.name === "monthlyBudget" ? 6 : props.name === "name" || props.name === "city" ? 160 : props.name === "goal" ? 1000 : 2000,
  };
  return (
    <div className={`field ${props.full ? "full" : ""}`}>
      <label htmlFor={id}>{props.label}{props.required ? <span aria-hidden="true"> *</span> : null}</label>
      {props.multiline ? <textarea {...common} rows={4} /> : <input {...common} type={props.name === "websiteUrl" ? "url" : "text"} />}
      {props.helper && <small className="field-hint" id={helpId}>{props.helper}</small>}
      {props.error && <span id={errorId} role="alert" className="field-error">{props.error}</span>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h3>{title}</h3>{children}</section>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [stage, setStage] = useState<Stage>(0);
  const [draft, setDraft] = useState<ProjectIntake>(blankIntake);
  const [checked, setChecked] = useState<IntakeValidation | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ProjectIntakeField, string>>>({});

  const edit = (field: ProjectIntakeField, value: string) => {
    setDraft((old) => ({ ...old, [field]: value }));
    setErrors((old) => ({ ...old, [field]: undefined }));
    setChecked(null);
  };

  const continueStep = (event?: FormEvent) => {
    event?.preventDefault();
    if (stage === 0) {
      setStage(1);
      return;
    }
    if (stage === 1 || stage === 3) {
      const result = validateProjectIntake(draft);
      if (!result.ok) {
        setErrors(result.errors);
        setStage(1);
        return;
      }
      setChecked(result);
      if (stage === 3) {
        setScreen("dashboard");
      } else {
        setStage(2);
      }
      return;
    }
    setStage(3);
  };

  const back = () => {
    if (stage > 0) setStage((stage - 1) as Stage);
  };
  const newProject = () => {
    setDraft(blankIntake);
    setChecked(null);
    setErrors({});
    setStage(0);
    setScreen("setup");
  };

  const selectedLabel = kinds.find((choice) => choice.kind === draft.kind)?.title ?? "Website";
  const current = checked?.ok ? checked.brief : null;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Preview navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <div><strong>Marketing Workspace</strong><span>Onboarding preview</span></div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className="active" onClick={() => setScreen("dashboard")} type="button"><span aria-hidden="true">⌂</span> Dashboard</button>
          <button onClick={() => setScreen("setup")} type="button"><span aria-hidden="true">▣</span> Projects</button>
          <button disabled type="button"><span aria-hidden="true">✦</span> AI Strategy <small>Later</small></button>
          <button disabled type="button"><span aria-hidden="true">▤</span> Content Studio <small>Later</small></button>
          <button disabled type="button"><span aria-hidden="true">▦</span> Calendar <small>Later</small></button>
        </nav>
        <p className="sidebar-note">Nothing is saved or published. Real accounts and AI are not connected.</p>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">Your AI marketing team <span className="muted">(future)</span></div>
          <span className="preview-pill">LOCAL PREVIEW · NOT SAVED</span>
        </header>

        <main className="workspace">
          {screen === "setup" ? (
            <>
              <div className="eyebrow">YOUR WORKSPACE / GET STARTED</div>
              <div className="pageheading">
                <div><h1>Create your project</h1><p className="muted">Tell us about your business. We'll guide you through the rest.</p></div>
              </div>
              <div className="wizard">
                <ol className="steps" aria-label="Onboarding steps">
                  {steps.map((label, index) => (
                    <li key={label} className={`step ${index === stage ? "current" : ""} ${index < stage ? "done" : ""}`} aria-current={index === stage ? "step" : undefined}>
                      <span className="step-number" aria-hidden="true">{index + 1}</span><span>{label}</span>
                    </li>
                  ))}
                </ol>
                <div className="wizard-body">
                  {stage === 0 && (
                    <section aria-labelledby="choose-heading">
                      <div className="eyebrow">STEP 1 OF 4</div>
                      <h2 id="choose-heading">What are you building?</h2>
                      <p className="muted">Choose the option that best describes your project.</p>
                      <div className="types" role="radiogroup" aria-label="Project type">
                        {kinds.map((item) => (
                          <button type="button" role="radio" aria-checked={draft.kind === item.kind}
                            key={item.kind} className={`type-option ${draft.kind === item.kind ? "selected" : ""}`}
                            onClick={() => edit("kind", item.kind)}>
                            <span className="type-icon" aria-hidden="true">{item.icon}</span>
                            <strong>{item.title}</strong><small>{item.help}</small>
                          </button>
                        ))}
                      </div>
                      <div className="soft-note">You can start with a simple description. No marketing knowledge needed.</div>
                    </section>
                  )}

                  {stage === 1 && (
                    <form id="project-intake" onSubmit={continueStep} noValidate aria-labelledby="business-heading">
                      <div className="eyebrow">STEP 2 OF 4 · {selectedLabel.toUpperCase()}</div>
                      <h2 id="business-heading">Tell us about your business</h2>
                      <p className="muted">We only use what you type here. No website or app will be scanned in this preview.</p>
                      <div className="fields">
                        <Field name="name" label="Business or project name" value={draft.name} required
                          placeholder="e.g. CITYWALK" error={errors.name} onChange={(v) => edit("name", v)} />
                        {draft.kind === "local" ? (
                          <Field name="city" label="Business city" value={draft.city} required
                            placeholder="e.g. Düsseldorf" error={errors.city} onChange={(v) => edit("city", v)} />
                        ) : (
                          <Field name="websiteUrl" label={draft.kind === "app" ? "App website URL" : "Website URL"}
                            value={draft.websiteUrl} required placeholder="https://example.com"
                            error={errors.websiteUrl} onChange={(v) => edit("websiteUrl", v)} />
                        )}
                        <Field name="goal" label="What do you want marketing to achieve?" value={draft.goal} required
                          placeholder="e.g. Find new customers" error={errors.goal} full onChange={(v) => edit("goal", v)} />
                        <Field name="description" label="What do you offer?" value={draft.description} required
                          multiline placeholder="Describe your product or service in your own words."
                          error={errors.description} full onChange={(v) => edit("description", v)} />
                        <Field name="monthlyBudget" label="Monthly marketing budget (EUR)" value={draft.monthlyBudget}
                          placeholder="Optional" error={errors.monthlyBudget} onChange={(v) => edit("monthlyBudget", v)}
                          helper="Optional. A budget here does not authorize payments." />
                        <Field name="ownerClaim" label="One business claim to review (optional)" value={draft.ownerClaim}
                          placeholder="Only enter a statement you want to check yourself."
                          error={errors.ownerClaim} full onChange={(v) => edit("ownerClaim", v)}
                          helper="This will be shown as an unconfirmed, owner-entered statement." />
                      </div>
                    </form>
                  )}

                  {stage === 2 && (
                    <section aria-labelledby="analysis-heading">
                      <div className="eyebrow">STEP 3 OF 4</div>
                      <h2 id="analysis-heading">About your business</h2>
                      <p className="muted">Your submitted brief is formatted locally. Automated analysis is not connected yet.</p>
                      <div className="analysis-banner" role="status"><span aria-hidden="true">◌</span><div>
                        <strong>No external analysis performed</strong>
                        <small>We haven't fetched your website, checked competitors, or called an AI provider.</small>
                      </div></div>
                      <Panel title="Details provided by you">
                        <p className="summary-row"><span>Project</span><strong>{current?.identity.name ?? draft.name}</strong></p>
                        <p className="summary-row"><span>Type</span><strong>{selectedLabel}</strong></p>
                        <p className="summary-row"><span>Goal</span><strong>{draft.goal}</strong></p>
                        <p className="summary-row"><span>Source status</span><strong>Owner-declared · not verified</strong></p>
                      </Panel>
                      <p className="quiet">Real source analysis, provenance checks and retry states will be added when the secure source adapters are implemented.</p>
                    </section>
                  )}

                  {stage === 3 && (
                    <section aria-labelledby="facts-heading">
                      <div className="eyebrow">STEP 4 OF 4</div>
                      <h2 id="facts-heading">Review your information</h2>
                      <p className="muted">Check the information you entered. Confirmation cannot be saved before secure sign-in and project storage exist.</p>
                      <div className="notice" role="status">Not confirmed · This preview cannot create an audit record or publish content.</div>
                      <Panel title="Owner-declared information">
                        <p className="summary-row"><span>Business name</span><strong>{draft.name}</strong></p>
                        <p className="summary-row"><span>{draft.kind === "local" ? "City" : "Submitted URL"}</span>
                          <strong>{draft.kind === "local" ? draft.city : draft.websiteUrl}</strong></p>
                        <p className="summary-row"><span>Goal</span><strong>{draft.goal}</strong></p>
                      </Panel>
                      <div className="review-field">
                        <Field name="ownerClaim" label="Edit your unconfirmed claim" value={draft.ownerClaim}
                          multiline placeholder="Optional. No facts were generated by an AI."
                          onChange={(v) => edit("ownerClaim", v)} error={errors.ownerClaim}
                          helper="This is still unconfirmed; it has not been independently verified." />
                      </div>
                    </section>
                  )}

                  <div className="wizard-footer">
                    <span className="quiet">Preview only — no account, AI requests, storage or publishing.</span>
                    <div className="buttons">
                      <button className="button secondary" type="button" onClick={back} disabled={stage === 0}>Back</button>
                      <button className="button primary" type={stage === 1 ? "submit" : "button"}
                        form={stage === 1 ? "project-intake" : undefined}
                        onClick={stage === 1 ? undefined : () => continueStep()}>
                        {stage === 3 ? "Preview dashboard →" : "Continue →"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow">YOUR WORKSPACE / PREVIEW</div>
              <div className="pageheading"><div><h1>Your project preview</h1>
                <p className="muted">A first look at your empty workspace. Your data is not saved.</p></div>
                <button type="button" className="button primary" onClick={newProject}>+ New project</button></div>
              <div className="preview-warning" role="status">Unpublished local draft — brand confirmation, research and customer accounts are not connected.</div>
              <div className="stats">
                <Panel title="Projects"><span className="stat-number">0</span><p className="muted">No saved project yet</p></Panel>
                <Panel title="Content created"><span className="stat-number">0</span><p className="muted">No content generated</p></Panel>
                <Panel title="Scheduled posts"><span className="stat-number">0</span><p className="muted">Publishing not connected</p></Panel>
              </div>
              <div className="dashboard-panels">
                <Panel title={draft.name || "Your future project"}>
                  <p className="muted">Your {selectedLabel.toLowerCase()} information is held in this tab only.</p>
                  <div className="task-row"><div><strong>Review your project brief</strong><small>Owner-declared details, not yet persisted</small></div><span className="tag">Preview</span></div>
                  <div className="task-row"><div><strong>Build your marketing strategy</strong><small>Research and planning not available yet</small></div><span className="tag">Planned</span></div>
                  <div className="task-row"><div><strong>Create your first post</strong><small>Content generation and publishing not available</small></div><span className="tag">Planned</span></div>
                  <button className="button secondary" onClick={() => { setStage(1); setScreen("setup"); }} type="button">Edit brief</button>
                </Panel>
                <Panel title="Your AI Marketing Team (coming later)">
                  <p className="muted">We'll turn confirmed business facts into marketing plans after source analysis, secure project storage, and editorial review are ready.</p>
                  <div className="soft-note">No paid AI requests, publishing or scheduling take place in this preview.</div>
                </Panel>
              </div>
            </>
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile preview navigation">
        <button type="button" onClick={() => setScreen("dashboard")}><span aria-hidden="true">⌂</span>Home</button>
        <button type="button" onClick={() => setScreen("setup")}><span aria-hidden="true">▣</span>Project</button>
        <button type="button" disabled><span aria-hidden="true">✦</span>AI Team (later)</button>
      </nav>
    </div>
  );
}
