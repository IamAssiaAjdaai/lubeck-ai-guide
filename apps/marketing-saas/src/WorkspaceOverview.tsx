import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  FolderOpen,
  Images,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import ContentLibrary, { CampaignCard } from './ContentLibrary';
import {
  channelLabel,
  goalLabel,
  loadOverview,
  nextAction,
  type OverviewData,
  type OverviewProject,
} from './overview.data';
import { loadCalendarPreview, type CalendarPreviewData } from './calendar-preview.data';
import './workspace-start-v2.css';

type Props = {
  projects: OverviewProject[];
  activeProjectId?: string;
  listOnly: boolean;
  onCreate: () => void;
  onMedia: () => void;
  onProfile: (pid?: string) => void;
  onDrafts: () => void;
  onCalendar: () => void;
  onResume: (pid: string, gid?: string) => void;
};

function thisWeek(reference = new Date()) {
  const monday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  return names.map((label, offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);
    return {
      label,
      day: date.getDate(),
      today: date.toDateString() === reference.toDateString(),
      dateTime: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    };
  });
}

/** Start is read-only. All writes continue through existing, authenticated workflows. */
export default function WorkspaceOverview({
  projects,
  activeProjectId,
  listOnly,
  onCreate,
  onMedia,
  onProfile,
  onDrafts,
  onCalendar,
  onResume,
}: Props) {
  const [calendarRetry, setCalendarRetry] = useState(0);
  const [calendarResult, setCalendarResult] = useState<{
    projectId: string;
    data?: CalendarPreviewData;
    error?: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([projects, retry]);
  const [result, setResult] = useState<{
    key: string;
    data?: OverviewData;
    error?: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void loadOverview(projects)
      .then((data) => {
        if (active) setResult({ key: requestKey, data });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, error: true });
      });
    return () => {
      active = false;
    };
  }, [projects, requestKey]);

  const selectedCalendarProjectId =
    activeProjectId && projects.some((p) => p.id === activeProjectId)
      ? activeProjectId
      : projects[0]?.id;

  useEffect(() => {
    if (!selectedCalendarProjectId || listOnly) return;
    let active = true;

    void loadCalendarPreview(selectedCalendarProjectId)
      .then((data) => {
        if (active) setCalendarResult({
          projectId: selectedCalendarProjectId,
          data,
        });
      })
      .catch(() => {
        if (active) setCalendarResult({
          projectId: selectedCalendarProjectId,
          error: true,
        });
      });

    return () => { active = false; };
  }, [selectedCalendarProjectId, listOnly, calendarRetry]);

  const data = result?.key === requestKey ? result.data : undefined;
  const error = result?.key === requestKey && result.error;

  if (error) {
    return (
      <div className="overview-feedback" role="alert">
        <p>Deine Übersicht konnte nicht vollständig geladen werden. Ungeprüfte Zahlen werden nicht angezeigt.</p>
        <button type="button" className="button secondary" onClick={() => setRetry((n) => n + 1)}>
          Erneut laden
        </button>
      </div>
    );
  }
  if (!data) {
    return <p className="overview-feedback" role="status">Deine Unternehmen und Inhalte werden geladen …</p>;
  }

  if (listOnly) {
    return (
      <div className="overview-content">
        {data.capped && (
          <p className="overview-limit">Die letzten 100 Aufträge je Unternehmen. Keine Laufzeit-Gesamtzahl.</p>
        )}
        {data.entries.length ? (
          <ContentLibrary entries={data.entries} onResume={onResume} />
        ) : (
          <div className="workspace-empty">
            <FolderOpen size={26} aria-hidden="true" />
            <div>
              <strong>Noch keine gespeicherten Inhalte.</strong>
              <p>Dein erster Pack beginnt mit deinem Unternehmen und bestätigten Angaben.</p>
              <button type="button" className="button primary" onClick={onCreate}>
                Inhalte vorbereiten <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const current = data.projects.find((item) => item.project.id === activeProjectId) ?? data.projects[0];
  const projectId = current?.project.id;
  const action = nextAction(data, activeProjectId);
  const entries = data.entries.filter((item) => item.projectId === projectId);
  const latestPack = entries.find((item) => item.kind === 'pack' && item.posts?.length);
  const latestDraft = entries.find((item) => item.kind === 'draft');
  const confirmedCount = current?.context?.facts.filter((fact) => fact.confirmation).length ?? 0;
  const city = current?.context?.markets?.find((market) => ['owner-service-city', 'owner-city'].includes(market.id))?.name;
  const selectedGoal = latestPack?.goal ?? current?.draft?.goal;
  const selectedChannel = latestPack?.channel ?? current?.draft?.channel;
  const calendarState =
    calendarResult?.projectId === projectId && !listOnly
      ? calendarResult : null;
  const calendarEntries = [...(calendarState?.data?.entries ?? [])]
    .sort((a, b) => Date.parse(a.plannedAt) - Date.parse(b.plannedAt));
  const nextCalendarEntry = calendarEntries[0];
  const calendarStatusLabel = {
    draft: 'Entwurf',
    review: 'Zur Prüfung',
    ready: 'Bereit zum Posten',
    published: 'Manuell veröffentlicht',
  } as const;

  const week = thisWeek();

  function continueNext() {
    if (action.kind === 'profile') onProfile(action.projectId);
    else if (action.kind === 'resume' && action.projectId) onResume(action.projectId, action.generationId);
    else onCreate();
  }

  function resumeDraft() {
    if (projectId) onResume(projectId);
    else onCreate();
  }

  return (
    <div className="overview-content w-start">
      <section className="w-start-focus" aria-labelledby="start-main-title">
        <div className="w-start-focus-copy">
          <p className="w-start-eyebrow"><Sparkles size={17} aria-hidden="true" /> DEIN NÄCHSTER SCHRITT</p>
          <h1 id="start-main-title">{action.title}</h1>
          <p className="w-start-lead">{action.description}</p>
          <button type="button" className="button primary w-start-main-button" onClick={continueNext}>
            {action.label} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="w-start-progress" aria-label="Gespeicherter Stand deines Unternehmens">
          <span className="w-start-progress-icon"><ShieldCheck size={24} aria-hidden="true" /></span>
          <p className="w-start-small-label">Dein bisheriger Stand</p>
          <strong>{current?.project.name ?? 'Noch kein Unternehmen angelegt'}</strong>
          <ul>
            <li>{current ? <CheckCircle2 size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />} {current ? 'Unternehmen angelegt' : 'Unternehmen noch anlegen'}</li>
            <li>{confirmedCount > 0 ? <CheckCircle2 size={17} aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />} {confirmedCount} bestätigte Angaben</li>
            <li><Target size={17} aria-hidden="true" /> {selectedGoal ? goalLabel(selectedGoal) : 'Marketing-Ziel noch offen'}</li>
          </ul>
        </div>
      </section>

      <section className="w-start-shortcuts" aria-labelledby="start-shortcuts-title">
        <div className="w-start-section-heading">
          <h2 id="start-shortcuts-title">Was möchtest du machen?</h2>
          <p>Wähle einfach deinen nächsten Schritt.</p>
        </div>
        <div className="w-start-shortcut-grid">
          <button type="button" className="w-start-shortcut" onClick={() => onProfile(projectId)}>
            <span className="w-start-shortcut-icon green"><BookOpen aria-hidden="true" /></span>
            <span><strong>Unternehmen &amp; Fakten</strong><small>Website, PDF und bestätigte Angaben</small></span>
            <ArrowRight className="w-start-shortcut-arrow" size={19} aria-hidden="true" />
          </button>
          <button type="button" className="w-start-shortcut" onClick={onCreate}>
            <span className="w-start-shortcut-icon lilac"><PenLine aria-hidden="true" /></span>
            <span><strong>Inhalte erstellen</strong><small>Ein Ziel wählen und Inhalte vorbereiten</small></span>
            <ArrowRight className="w-start-shortcut-arrow" size={19} aria-hidden="true" />
          </button>
          <button type="button" className="w-start-shortcut" onClick={onDrafts}>
            <span className="w-start-shortcut-icon yellow"><FolderOpen aria-hidden="true" /></span>
            <span><strong>Meine Inhalte</strong><small>Entwürfe und Content Packs öffnen</small></span>
            <ArrowRight className="w-start-shortcut-arrow" size={19} aria-hidden="true" />
          </button>
        </div>
      </section>

        <section className="w-start-card w-start-calendar w-start-calendar-wide" aria-labelledby="start-calendar-title">
          <div className="w-start-card-title"><span className="w-start-card-icon"><CalendarDays aria-hidden="true" /></span>
            <div><h2 id="start-calendar-title">Dein Kalender</h2><p>Die Woche auf einen Blick</p></div>
            <span className="w-start-quiet-tag">Manuelle Planung</span>
          </div>
          <div className="w-start-calendar-body">
          <div className="w-start-week" aria-label="Aktuelle Woche zur Orientierung; gespeicherte Termine im Kalender öffnen">
            {week.map((day) => (
              <div className={`w-start-weekday${day.today ? ' is-today' : ''}`} key={day.dateTime}>
                <span>{day.label}</span><time dateTime={day.dateTime}>{day.day}</time>
              </div>
            ))}
          </div>
          <div className="w-start-calendar-empty" aria-live="polite">
            <CalendarDays aria-hidden="true" size={22} />
            <div>
              {!projectId ? (
                <>
                  <strong>Noch kein Unternehmen ausgewählt.</strong>
                  <p>Wähle zuerst ein Unternehmen aus.</p>
                </>
              ) : !calendarState ? (
                <p>Deine Termine werden geladen …</p>
              ) : calendarState.error ? (
                <>
                  <strong>Kalender konnte nicht geladen werden.</strong>
                  <p>Deine Termine wurden nicht verändert.</p>
                  <button type="button" className="w-start-text-button"
                    onClick={() => setCalendarRetry((value) => value + 1)}>
                    Erneut laden
                  </button>
                </>
              ) : nextCalendarEntry ? (
                <>
                  <strong>
                    {channelLabel(nextCalendarEntry.channel)} · Beitrag {nextCalendarEntry.postIndex + 1}
                  </strong>
                  <p>
                    {new Intl.DateTimeFormat('de-DE', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(nextCalendarEntry.plannedAt))}
                    {' · '}
                    {calendarStatusLabel[nextCalendarEntry.status]}
                  </p>
                  <p className="w-start-calendar-excerpt">{nextCalendarEntry.excerpt}</p>
                  {calendarState.data?.capped && (
                    <p>Weitere Termine sind möglicherweise nicht sichtbar.</p>
                  )}
                  <button type="button" className="w-start-text-button"
                    onClick={onCalendar}>
                    Kalender öffnen <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <strong>Keine Beiträge für diese Woche geplant.</strong>
                  <p>Plane einen gespeicherten Beitrag in deinem Kalender. Kein automatisches Posten.</p>
                  {calendarState.data?.capped && (
                    <p>Die Kalenderergebnisse sind möglicherweise unvollständig.</p>
                  )}
                  <button type="button" className="w-start-text-button"
                    onClick={onCalendar}>
                    Kalender öffnen <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        </section>


      <div className="w-start-two-col w-start-bottom">
        <section className="w-start-card" aria-labelledby="start-content-title">
          <div className="w-start-card-title"><span className="w-start-card-icon lilac"><FolderOpen aria-hidden="true" /></span>
            <div><h2 id="start-content-title">Zuletzt bearbeitet</h2><p>Direkt an deiner Arbeit weitermachen</p></div>
          </div>
          {entries.length ? (
            <>
              <div className="w-start-recent-list">
                {entries.slice(0, 2).map((item) => <CampaignCard key={`${item.projectId}-${item.id}`} entry={item} compact onResume={onResume} />)}
              </div>
              <button type="button" className="w-start-text-button" onClick={onDrafts}>Alle Inhalte ansehen <ArrowRight size={16} aria-hidden="true" /></button>
            </>
          ) : (
            <div className="w-start-empty-detail">
              <p>Noch keine gespeicherten Entwürfe oder Packs.</p>
              <button type="button" className="button secondary" onClick={onCreate}>Ersten Entwurf starten <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          )}
          {latestDraft && !entries.slice(0,2).includes(latestDraft) && (
            <button type="button" className="w-start-text-button" onClick={resumeDraft}>Gespeicherten Entwurf fortsetzen <ArrowRight size={16} aria-hidden="true" /></button>
          )}
        </section>

        <section className="w-start-card" aria-labelledby="start-knowledge-title">
          <div className="w-start-card-title"><span className="w-start-card-icon"><BookOpen aria-hidden="true" /></span>
            <div><h2 id="start-knowledge-title">Dein Unternehmenswissen</h2><p>Die Grundlage für passende Inhalte</p></div>
          </div>
          <strong className="w-start-business-name">{current?.project.name ?? 'Noch kein Unternehmen'}</strong>
          <dl className="w-start-brand-list">
            <div><dt>Stadt</dt><dd>{city ?? 'Noch nicht hinterlegt'}</dd></div>
            <div><dt>Bestätigte Fakten</dt><dd>{confirmedCount}</dd></div>
            <div><dt>Ziel</dt><dd>{selectedGoal ? goalLabel(selectedGoal) : 'Noch offen'}</dd></div>
            <div><dt>Kanal</dt><dd>{selectedChannel ? channelLabel(selectedChannel) : 'Noch offen'}</dd></div>
            <div><dt>Grundlage</dt><dd>{current?.gate.ready ? 'Für drei Themen ausreichend' : 'Weitere Angaben nötig'}</dd></div>
          </dl>
          <div className="w-start-knowledge-actions">
            <button type="button" className="w-start-text-button" onClick={() => onProfile(projectId)}>Angaben prüfen <ArrowRight size={16} aria-hidden="true" /></button>
            <button type="button" className="w-start-text-button" onClick={onMedia}><Images size={16} aria-hidden="true" /> Medien ansehen</button>
          </div>
        </section>
      </div>
      {data.capped && <p className="overview-limit">Es werden nur die letzten 100 Aufträge je Unternehmen geladen.</p>}
      <p className="w-start-safety">Geschlossener Pilot · keine Live-KI · kein automatisches Publishing. Alle Freigaben erfolgen durch dich.</p>
    </div>
  );
}
