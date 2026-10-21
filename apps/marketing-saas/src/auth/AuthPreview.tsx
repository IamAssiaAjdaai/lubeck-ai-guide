import { useState, type FormEvent } from "react";
import { forgotPasswordSchema, getAuthFieldErrors, signInSchema, signUpSchema, type AuthField } from "./validation";
import "./auth.css";

type AuthView = "signup" | "signin" | "verify" | "forgot" | "expired";
type Draft = { name: string; email: string; password: string };
const empty: Draft = { name: "", email: "", password: "" };

const views: { key: AuthView; label: string }[] = [
  { key: "signup", label: "Sign up" },
  { key: "signin", label: "Sign in" },
  { key: "verify", label: "Verify email" },
  { key: "forgot", label: "Reset password" },
  { key: "expired", label: "Expired link" },
];

export default function AuthPreview() {
  const [view, setView] = useState<AuthView>("signup");
  const [draft, setDraft] = useState<Draft>(empty);
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const go = (next: AuthView) => {
    setView(next);
    setDraft(empty); // Password and email never survive navigation in this preview.
    setErrors({});
    setNotice("");
    setShowPassword(false);
  };
  const edit = (field: AuthField, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setNotice("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result =
      view === "signup"
        ? signUpSchema.safeParse(draft)
        : view === "signin"
          ? signInSchema.safeParse({ email: draft.email, password: draft.password })
          : forgotPasswordSchema.safeParse({ email: draft.email });
    if (!result.success) {
      setErrors(getAuthFieldErrors(result.error.issues));
      setNotice("");
      return;
    }
    // NEVER simulate account creation, email delivery, authentication, or reset.
    // Real network actions will be wired only after independent backend review.
    setDraft(empty);
    setErrors({});
    setNotice(
      view === "signup"
        ? "Your details passed local validation. Account creation and verification emails are not connected yet."
        : view === "signin"
          ? "Your fields passed local validation. Sign-in and sessions are not connected yet."
          : "Your email format passed local validation. No password reset email was sent.",
    );
  };

  function field(name: AuthField, label: string, autocomplete: string) {
    const id = `saas-auth-${name}`;
    const errorId = `${id}-error`;
    const isPassword = name === "password";
    return (
      <div className="auth-field" key={name}>
        <label htmlFor={id}>{label}</label>
        <div className="auth-input-wrap">
          <input
            id={id}
            name={name}
            type={isPassword ? (showPassword ? "text" : "password") : name === "email" ? "email" : "text"}
            autoComplete={autocomplete}
            maxLength={name === "name" ? 100 : name === "email" ? 254 : 128}
            value={draft[name]}
            onChange={(event) => edit(name, event.target.value)}
            aria-invalid={errors[name] ? true : undefined}
            aria-describedby={errors[name] ? errorId : undefined}
            placeholder={name === "email" ? "you@company.com" : isPassword ? "Enter your password" : "e.g. Alex Morgan"}
            required
          />
          {isPassword && (
            <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          )}
        </div>
        {errors[name] && <span className="auth-error" id={errorId} role="alert">{errors[name]}</span>}
      </div>
    );
  }

  function formContent() {
    if (view === "signup") {
      return (
        <>
          <div className="auth-top-switch">Already have an account? <button type="button" onClick={() => go("signin")}>Sign in</button></div>
          <div className="auth-glyph" aria-hidden="true">✦</div>
          <h1>Create your account</h1>
          <p className="auth-description">Get started with your own marketing workspace.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            {field("name", "Your name", "name")}
            {field("email", "Work email", "email")}
            {field("password", "Password", "new-password")}
            <p className="password-rule">At least 12 characters. Use a unique password.</p>
            <button className="auth-primary" type="submit">Validate sign-up details</button>
          </form>
          <p className="auth-foot">Terms and privacy notice must be approved before real account creation.</p>
        </>
      );
    }
    if (view === "signin") {
      return (
        <>
          <div className="auth-top-switch">New here? <button type="button" onClick={() => go("signup")}>Create account</button></div>
          <div className="auth-glyph" aria-hidden="true">↗</div>
          <h1>Welcome back</h1>
          <p className="auth-description">Sign in to continue to your workspace.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            {field("email", "Work email", "email")}
            {field("password", "Password", "current-password")}
            <div className="auth-right-link"><button type="button" onClick={() => go("forgot")}>Forgot your password?</button></div>
            <button className="auth-primary" type="submit">Validate sign-in details</button>
          </form>
          <p className="auth-foot">No account yet? <button type="button" onClick={() => go("signup")}>Create one</button></p>
        </>
      );
    }
    if (view === "verify") {
      return (
        <div className="auth-message-screen">
          <div className="auth-glyph big" aria-hidden="true">✉</div>
          <h1>Check your email</h1>
          <p className="auth-description">A real account will need a verified email address before accessing the workspace.</p>
          <div className="auth-banner">Design preview: no email has been sent and no verification link exists.</div>
          <button className="auth-primary" type="button" onClick={() => go("signin")}>Back to sign in</button>
          <p className="auth-foot">Resend verification will be available after the secure email backend is connected.</p>
        </div>
      );
    }
    if (view === "forgot") {
      return (
        <>
          <div className="auth-glyph" aria-hidden="true">♧</div>
          <h1>Reset your password</h1>
          <p className="auth-description">Enter your work email. The real app will give a generic response whether or not an account exists.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            {field("email", "Work email", "email")}
            <button className="auth-primary" type="submit">Validate reset request</button>
          </form>
          <p className="auth-foot"><button type="button" onClick={() => go("signin")}>Back to sign in</button></p>
        </>
      );
    }
    return (
      <div className="auth-message-screen">
        <div className="auth-glyph big" aria-hidden="true">⌛</div>
        <h1>Link expired</h1>
        <p className="auth-description">This confirmation or password-reset link is invalid or has expired. Request a fresh one securely.</p>
        <div className="auth-banner warning">Expired, already-used and invalid tokens must not sign anyone in automatically.</div>
        <button type="button" className="auth-primary" onClick={() => go("forgot")}>Request a new reset link</button>
        <p className="auth-foot"><button type="button" onClick={() => go("signin")}>Back to sign in</button></p>
      </div>
    );
  }

  return (
    <div className="auth-preview-shell">
      <aside className="auth-preview-menu" aria-label="Authentication design screens">
        <div className="auth-menu-brand"><span className="auth-brand-mark" aria-hidden="true">✦</span>
          <span>Marketing Workspace<small>Authentication V1</small></span></div>
        <p className="auth-menu-label">REVIEW SCREENS</p>
        <nav className="auth-screen-nav" aria-label="Choose auth screen">
          {views.map(({ key, label }, index) => (
            <button type="button" key={key} aria-current={view === key ? "page" : undefined}
              className={view === key ? "active" : ""} onClick={() => go(key)}>
              {index + 1}. {label}
            </button>
          ))}
        </nav>
        <div className="auth-menu-note">Design-based local UI only. No accounts, email delivery, sessions or storage.</div>
      </aside>
      <main className="auth-preview-main">
        <header className="auth-preview-top">
          <span>Authentication / Desktop + Mobile</span>
          <span className="auth-preview-label">LOCAL UI PREVIEW</span>
        </header>
        <div className="auth-preview-content">
          <div className="auth-eyebrow">FOUNDATION / AUTHENTICATION / V1</div>
          <h2>Simple, secure account access.</h2>
          <p className="auth-overview">Email + password, verification required later. Same calm indigo design as the approved onboarding.</p>
          <div className="auth-card">
            <section className="auth-story" aria-label="Product introduction">
              <div className="auth-story-brand"><span aria-hidden="true">✦</span> Marketing Workspace</div>
              <div className="auth-story-center">
                <p>YOUR AI MARKETING TEAM</p>
                <h2>Make your business impossible to overlook.</h2>
                <div className="auth-story-sub">A thoughtful workspace for your marketing — from business facts to strategy and content. You're always in control.</div>
                <ul>
                  <li>Verify your business facts</li>
                  <li>Approve content before publishing</li>
                  <li>Keep projects organized</li>
                </ul>
              </div>
              <small>V1 design preview · product name is a placeholder</small>
            </section>
            <section className="auth-card-form" aria-label="Authentication form preview">
              {formContent()}
              {notice && <div className="auth-banner success" role="status">{notice}</div>}
            </section>
          </div>
          <p className="auth-preview-disclaimer">Preview only — validation runs locally. No passwords are transmitted or saved; no account is created.</p>
        </div>
      </main>
    </div>
  );
}
