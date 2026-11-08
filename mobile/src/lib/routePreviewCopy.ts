export function routePreviewCopy(locale: string) {
  return locale === "de" ? {
    start: "Spaziergang starten", stops: "Deine Stopps", map: "Reihenfolge der Stopps", fit: "Alle Stopps auf der Karte zeigen", stop: "Stopp",
    schematic: "Die gestrichelte Linie zeigt die Reihenfolge der Stopps, keine berechnete Wegführung.",
    visits: "{minutes} Min. an den Stopps", visitsUnknown: "Besuchszeit nicht vollständig angegeben",
    timing: "Geh- und Gesamtzeit unbestätigt", timingDetails: "Zeitangaben erläutern",
    published: "Veröffentlichte Schätzung: {minutes} Min. Ihre Bedeutung als Geh- oder Gesamtzeit ist nicht dokumentiert.",
    conflict: "Diese Schätzung ist kürzer als die angegebenen Besuchszeiten zusammen. Sie wird deshalb nicht als Gesamtdauer verwendet.",
    timingHelp: "Besuchszeiten sind Aufenthalte an den Stopps. Die Gesamtdauer umfasst zusätzlich die Gehzeit. Eine verifizierte Gehzeit liegt für diese Route nicht vor.",
    unavailable: "Diese Route ist momentan unvollständig. Bitte versuche es später erneut.",
    browse: "Ort entdecken", photo: "Bildnachweise", walking: "Zu Fuß entdecken", noReturn: "Dies ist eine veröffentlichte Route ohne persönliche Rückkehrzeit. Für einen zeitlich begrenzten Spaziergang nutze den Routenplaner.",
    build: "Spaziergang mit Rückkehrzeit planen", selected: "Auf der Karte ausgewählt", description: "Über diesen Spaziergang",
  } : {
    start: "Start Walk", stops: "Your stops", map: "Stop sequence", fit: "Show all stops on the map", stop: "Stop",
    schematic: "The dashed line shows stop order, not calculated walking directions.",
    visits: "{minutes} min at stops", visitsUnknown: "Visit estimates incomplete",
    timing: "Walking & total time unverified", timingDetails: "Explain duration estimates",
    published: "Published estimate: {minutes} min. Its scope as walking or total time is not documented.",
    conflict: "This estimate is shorter than the combined stop visits, so it is not used as the full experience duration.",
    timingHelp: "Visit time covers time at the stops. The full experience also includes walking. Verified walking time is unavailable for this route.",
    unavailable: "This route is currently incomplete. Please try again later.",
    browse: "Explore place", photo: "Photo Credits", walking: "Explore on foot", noReturn: "This published route has no personal return-by time. Use the walk builder for a time-constrained walk.",
    build: "Plan a walk with a return-by time", selected: "Selected on the map", description: "About this walk",
  };
}
