import { cityLaunches } from "@/data/cityAvailability";
import styles from "./landing-next.module.css";

const publicCities = Object.entries(cityLaunches).filter(([, city]) => city.status !== "unpublished");
const available = publicCities.filter(([, city]) => city.status === "available");
const planned = publicCities.filter(([, city]) => city.status === "coming_soon");
const names = (cities: typeof publicCities) => new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(cities.map(([, city]) => city.name));
export const launchLabel = available.length ? `Starting in ${names(available)}` : "Cities preparing for launch";
export const launchDescription = available.length ? `CITYWALK starts in ${names(available)}, with more cities planned.` : "CITYWALK cities are preparing for launch.";
export const cityAnswer = [available.length ? `${names(available)} ${available.length === 1 ? "is the first city" : "are supported"}.` : "No cities are available yet.", planned.length ? `${names(planned)} are coming soon.` : ""].filter(Boolean).join(" ");

export function CityCards() {
  return (
    <div className={styles.cities}>
      {publicCities.map(([slug, city]) => (
        <article key={slug} className={`${styles.city} ${city.status === "coming_soon" ? styles.soon : ""}`}>
          {city.status === "available" && <svg viewBox="0 0 400 120" aria-hidden="true">
            <path fill="#fff" d="M0 120V80h40V40l10-30 10 30v40h30V60h30V30l8-26 8 26v30h30v30z M200 120V70h30V50l8-20 8 20v20h40v50z M330 120V60h20V35l6-25 6 25v25h38v60z" />
          </svg>}
          <span className={styles.tagi}>{city.status === "coming_soon" ? "Coming soon" : available.length === 1 ? "First CITYWALK city" : "Available city"}</span>
          <h3>{city.name}</h3>
          <p>{city.status === "coming_soon" ? "Not available yet." : slug === "lubeck" ? "Old Town brick gothic, historic gates and waterfront streets. Travemünde may follow later as a Lübeck-area discovery topic." : "Explore public city content."}</p>
        </article>
      ))}
    </div>
  );
}
