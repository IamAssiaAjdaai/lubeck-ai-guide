export function activeWalkCopy(locale: string) {
  return locale === "de" ? {
    active: "Dein Spaziergang", paused: "Spaziergang pausiert", ended: "Spaziergang beendet", complete: "Spaziergang abgeschlossen",
    progress: "Stopp {current} von {total}", visited: "besucht", skipped: "übersprungen", remaining: "offen", current: "Aktueller Stopp", stops: "Deine Stopps",
    overview: "Stoppübersicht", overviewHelp: "Die Linie zeigt nur die Reihenfolge der Stopps, keine Wegführung. Du entscheidest selbst, wann du einen Stopp besucht hast.",
    fit: "Alle Stopps zeigen", stop: "Stopp", details: "Stopp ansehen", mark: "Besucht · Weiter", skip: "Stopp überspringen", pause: "Pausieren", resume: "Spaziergang fortsetzen", end: "Spaziergang beenden",
    endQuestion: "Spaziergang beenden?", endHelp: "Dein bisheriger Fortschritt bleibt auf diesem Gerät gespeichert. Du kannst später an dieser Stelle fortsetzen.", keep: "Abbrechen",
    saved: "Fortschritt wird auf diesem Gerät gespeichert.", pausedHelp: "Dein Fortschritt bleibt erhalten. Setze fort, wenn du bereit bist.", completedHelp: "Alle Stopps sind besucht oder übersprungen. Danke fürs Entdecken!",
    retry: "Erneut versuchen", error: "Dein Fortschritt konnte nicht gespeichert oder geladen werden. Bitte versuche es erneut.", invalid: "Dieser Spaziergang ist nicht mehr verfügbar oder seine Stopps haben sich geändert.",
    preview: "Zur Routenübersicht", city: "Zur Stadtübersicht", selected: "Auf der Karte ausgewählt", unknown: "Keine Besuchszeit angegeben",
  } : {
    active: "Your walk", paused: "Walk paused", ended: "Walk ended", complete: "Walk complete",
    progress: "Stop {current} of {total}", visited: "visited", skipped: "skipped", remaining: "remaining", current: "Current stop", stops: "Your stops",
    overview: "Stop overview", overviewHelp: "The line shows stop order, not walking directions. You decide when you have visited a stop.",
    fit: "Show all stops", stop: "Stop", details: "View stop details", mark: "Visited · Next stop", skip: "Skip this stop", pause: "Pause", resume: "Resume walk", end: "End walk",
    endQuestion: "End this walk?", endHelp: "Your progress stays saved on this device. You can resume from this stop later.", keep: "Cancel",
    saved: "Progress is saved on this device.", pausedHelp: "Your progress is kept. Resume whenever you are ready.", completedHelp: "Every stop has been visited or skipped. Thanks for exploring!",
    retry: "Try again", error: "Your progress could not be saved or loaded. Please try again.", invalid: "This walk is no longer available or its stops have changed.",
    preview: "Route preview", city: "City hub", selected: "Selected on the map", unknown: "Visit time not provided",
  };
}
