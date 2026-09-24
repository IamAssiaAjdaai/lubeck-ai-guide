"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type StopPlace = Readonly<{ id: number; cityId: number; name: string }>;

export function TourStopEditor({
  initialStopIds,
  places,
}: Readonly<{
  initialStopIds: readonly number[];
  places: readonly StopPlace[];
}>) {
  const [stopIds, setStopIds] = useState([...initialStopIds]);
  const [candidate, setCandidate] = useState(places[0]?.id ?? 0);
  const placeById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places],
  );

  function move(index: number, offset: -1 | 1) {
    setStopIds((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <fieldset className="rounded-xl border border-border p-4">
      <legend className="px-2 text-sm font-bold">Ordered stops</legend>
      <input name="stopPlaceIds" type="hidden" value={stopIds.join("\n")} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="min-h-11 flex-1 rounded-xl border border-border bg-white px-3 text-sm"
          onChange={(event) => setCandidate(Number(event.target.value))}
          value={candidate}
        >
          {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
        </select>
        <button
          className="button-secondary min-h-11 px-4"
          onClick={() => setStopIds((current) => current.includes(candidate) || !candidate ? current : [...current, candidate])}
          type="button"
        >
          <Plus aria-hidden="true" size={17} /> Add stop
        </button>
      </div>
      <ol className="mt-4 space-y-2">
        {stopIds.map((id, index) => (
          <li className="flex items-center gap-2 rounded-xl bg-slate-50 p-2" key={id}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{placeById.get(id)?.name ?? `Place #${id}`}</span>
            <button aria-label={`Move stop ${index + 1} up`} className="grid size-11 place-items-center rounded-lg hover:bg-white" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp aria-hidden="true" size={17} /></button>
            <button aria-label={`Move stop ${index + 1} down`} className="grid size-11 place-items-center rounded-lg hover:bg-white" disabled={index === stopIds.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown aria-hidden="true" size={17} /></button>
            <button aria-label={`Remove stop ${index + 1}`} className="grid size-11 place-items-center rounded-lg text-red-700 hover:bg-white" onClick={() => setStopIds((current) => current.filter((stopId) => stopId !== id))} type="button"><Trash2 aria-hidden="true" size={17} /></button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}
