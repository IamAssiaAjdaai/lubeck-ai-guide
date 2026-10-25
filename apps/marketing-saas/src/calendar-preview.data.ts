import { api } from './api';

export type CalendarPreviewEntry = {
  id: string;
  generationId: string;
  postIndex: number;
  plannedAt: string;
  channel: string;
  excerpt: string;
  status: 'draft' | 'review' | 'ready' | 'published';
  staleVersion: boolean;
  manualPublishedAt: string | null;
};

export type CalendarPreviewData = {
  entries: CalendarPreviewEntry[];
  capped: boolean;
  manualPublishingOnly: true;
};

export function calendarWeekBounds(reference = new Date()) {
  const monday = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  );

  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7)
  );

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  return {
    from: monday.toISOString(),
    to: nextMonday.toISOString(),
  };
}

export async function loadCalendarPreview(
  projectId: string,
  reference = new Date()
): Promise<CalendarPreviewData> {
  const { from, to } = calendarWeekBounds(reference);

  return api<CalendarPreviewData>(
    `/api/projects/${encodeURIComponent(projectId)}/calendar` +
    `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}
