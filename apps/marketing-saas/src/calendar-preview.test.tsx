import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { api } from './api';
import WorkspaceOverview from './WorkspaceOverview';
import { calendarWeekBounds, loadCalendarPreview } from './calendar-preview.data';

vi.mock('./api', () => ({ api: vi.fn() }));
const request = vi.mocked(api);

const projects = [
  { id: 'a', name: 'Firma A' },
  { id: 'b', name: 'Firma B' },
];

const callbacks = () => ({
  onCreate: vi.fn(), onMedia: vi.fn(), onProfile: vi.fn(),
  onDrafts: vi.fn(), onCalendar: vi.fn(), onResume: vi.fn(),
});

const entry = {
  id: 'appointment-1',
  generationId: 'generation-1',
  postIndex: 0,
  plannedAt: new Date('2026-10-25T15:00:00Z').toISOString(),
  channel: 'instagram',
  excerpt: 'Gespeicherter Testbeitrag',
  status: 'review' as const,
  staleVersion: false,
  manualPublishedAt: null,
};

const calendar = (entries: typeof entry[] = [], capped = false) => ({
  entries, capped, manualPublishingOnly: true as const,
});

let calendarFailed = false;
let currentCalendar = calendar();

beforeEach(() => {
  calendarFailed = false;
  currentCalendar = calendar();
  request.mockReset();
  request.mockImplementation(async (path) => {
    if (path.includes('/calendar?')) {
      if (calendarFailed) throw Error('OFFLINE');
      return currentCalendar;
    }
    if (path.endsWith('/workspace/readiness'))
      return { ready: true, reason: 'ready', revision: 1, questions: [] };
    if (path.endsWith('/workspace/draft')) return null;
    if (path.endsWith('/packs')) return [];
    if (path.endsWith('/creative')) return { assets: [] };
    return {
      context: {
        identity: { name: 'Testfirma' },
        facts: [{ statement: 'Testdienstleistung', confirmation: {} }],
      },
    };
  });
});

afterEach(cleanup);

describe('Start V3 Calendar Preview', () => {
  it('shows a genuine empty state and never invents scheduled posts', async () => {
    render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()} />);
    const region = await screen.findByRole('region', { name: 'Dein Kalender' });
    expect(await within(region).findByText('Keine Beiträge für diese Woche geplant.')).toBeTruthy();
    expect(within(region).queryByText(/Gespeicherter Testbeitrag/)).toBeNull();
  });

  it('shows a saved appointment with channel, time and review status', async () => {
    currentCalendar = calendar([entry]);
    render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()} />);
    const region = await screen.findByRole('region', { name: 'Dein Kalender' });
    expect(await within(region).findByText('Instagram · Beitrag 1')).toBeTruthy();
    expect(within(region).getByText('Gespeicherter Testbeitrag')).toBeTruthy();
    expect(within(region).getByText(/Zur Prüfung/)).toBeTruthy();
    expect(within(region).getByText(/16:00/)).toBeTruthy();
  });

  it('handles API failure and recovers through retry', async () => {
    calendarFailed = true;
    const cb = callbacks();
    render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...cb} />);
    const region = await screen.findByRole('region', { name: 'Dein Kalender' });
    await within(region).findByText('Kalender konnte nicht geladen werden.');
    expect(within(region).queryByText('Keine Beiträge für diese Woche geplant.')).toBeNull();
    calendarFailed = false;
    currentCalendar = calendar([entry]);
    fireEvent.click(within(region).getByRole('button', { name: 'Erneut laden' }));
    expect(await within(region).findByText('Instagram · Beitrag 1')).toBeTruthy();
  });

  it('isolates appointments when switching projects', async () => {
    currentCalendar = calendar([entry]);
    const cb = callbacks();
    const view = render(<WorkspaceOverview projects={projects} activeProjectId="a" listOnly={false} {...cb} />);
    const region = await screen.findByRole('region', { name: 'Dein Kalender' });
    await within(region).findByText('Instagram · Beitrag 1');
    currentCalendar = calendar([]);
    view.rerender(<WorkspaceOverview projects={projects} activeProjectId="b" listOnly={false} {...cb} />);
    await within(region).findByText('Keine Beiträge für diese Woche geplant.');
    expect(within(region).queryByText('Gespeicherter Testbeitrag')).toBeNull();
  });

  it('makes no calendar request without a project', async () => {
    render(<WorkspaceOverview projects={[]} listOnly={false} {...callbacks()} />);
    await screen.findByRole('heading', { name: 'Dein Unternehmen ist der Anfang.' });
    expect(request.mock.calls.filter(([p]) => p.includes('/calendar?'))).toHaveLength(0);
  });

  it('marks capped calendar results as incomplete', async () => {
    currentCalendar = calendar([entry], true);
    render(<WorkspaceOverview projects={[projects[0]]} listOnly={false} {...callbacks()} />);
    const region = await screen.findByRole('region', { name: 'Dein Kalender' });
    expect(await within(region).findByText('Weitere Termine sind möglicherweise nicht sichtbar.')).toBeTruthy();
  });
});

describe('Calendar week boundaries', () => {
  it('uses Monday-to-Monday local calendar dates', () => {
    const bounds = calendarWeekBounds(new Date(2026, 9, 25, 12));
    const monday = new Date(bounds.from);
    const nextMonday = new Date(bounds.to);
    expect(monday.getDay()).toBe(1);
    expect(nextMonday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
    expect(nextMonday.getHours()).toBe(0);
  });

  it('uses an authenticated project-scoped GET endpoint', async () => {
    await loadCalendarPreview('a', new Date(2026, 9, 25, 12));
    expect(request.mock.calls.some(([p]) =>
      p.startsWith('/api/projects/a/calendar?from=') && p.includes('&to=')
    )).toBe(true);
  });

  it('preserves seven calendar days across a DST boundary', () => {
    const bounds = calendarWeekBounds(new Date(2026, 9, 25, 12));
    const from = new Date(bounds.from);
    const to = new Date(bounds.to);
    expect(from.getDate()).toBe(19);
    expect(to.getDate()).toBe(26);
  });
});

describe('Calendar Preview edge-case regression', () => {
  it('shows incomplete-results warning even when the calendar is empty', async () => {
    currentCalendar = calendar([], true);

    render(
      <WorkspaceOverview
        projects={[projects[0]]}
        listOnly={false}
        {...callbacks()}
      />
    );

    const region = await screen.findByRole('region', {
      name: 'Dein Kalender',
    });

    expect(
      await within(region).findByText(
        'Die Kalenderergebnisse sind möglicherweise unvollständig.'
      )
    ).toBeTruthy();
  });

  it('ignores a delayed response from a previously selected project', async () => {
    const original = request.getMockImplementation()!;

    let resolveOldRequest:
      | ((value: ReturnType<typeof calendar>) => void)
      | undefined;

    const delayedResponse = new Promise<ReturnType<typeof calendar>>(
      (resolve) => {
        resolveOldRequest = resolve;
      }
    );

    request.mockImplementation(async (path) => {
      if (path.includes('/projects/a/calendar?')) {
        return delayedResponse;
      }

      if (path.includes('/projects/b/calendar?')) {
        return calendar([]);
      }

      return original(path);
    });

    const cb = callbacks();

    const view = render(
      <WorkspaceOverview
        projects={projects}
        activeProjectId="a"
        listOnly={false}
        {...cb}
      />
    );

    await waitFor(() => {
      expect(
        request.mock.calls.some(([path]) =>
          path.includes('/projects/a/calendar?')
        )
      ).toBe(true);
    });

    view.rerender(
      <WorkspaceOverview
        projects={projects}
        activeProjectId="b"
        listOnly={false}
        {...cb}
      />
    );

    const region = await screen.findByRole('region', {
      name: 'Dein Kalender',
    });

    await within(region).findByText(
      'Keine Beiträge für diese Woche geplant.'
    );

    resolveOldRequest!(calendar([entry]));

    await waitFor(() => {
      expect(
        within(region).queryByText('Gespeicherter Testbeitrag')
      ).toBeNull();
    });
  });

  it('handles the actual Europe/Berlin autumn DST transition', () => {
    const bounds = calendarWeekBounds(
      new Date(2026, 9, 25, 12)
    );

    expect(bounds.from).toBe(
      '2026-10-18T22:00:00.000Z'
    );

    expect(bounds.to).toBe(
      '2026-10-25T23:00:00.000Z'
    );

    expect(
      (Date.parse(bounds.to) - Date.parse(bounds.from)) /
        3_600_000
    ).toBe(169);
  });
});
