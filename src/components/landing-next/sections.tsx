import Image from "next/image";
import Link from "next/link";
import styles from "./landing-next.module.css";
import { CityCards, cityAnswer, launchDescription, launchLabel } from "./cities";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="h1">
      <div className={styles.wrap}>
        <div>
          <h1 id="h1" className={styles.reveal}>Make every city your own.</h1>
          <p className={styles.lead + " " + styles.reveal + " " + styles.d2}>Discover remarkable places at your pace. Create personal walks, explore local stories, and make the most of your time.</p>
          <div className={styles.cta + " " + styles.reveal + " " + styles.d3}>
            <Link className={styles.btn + " " + styles.btnPrimary} href="/explore" prefetch={false}>Start exploring</Link>
            <a className={styles.btn + " " + styles.btnGhost} href="#download">Get the app</a>
          </div>
          <ul className={styles.trust + " " + styles.reveal + " " + styles.d3}>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z">
                </path>
                <circle cx="12" cy="9" r="2.5">
                </circle>
              </svg>{launchLabel}</li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9">
                </circle>
                <path d="M12 7v5l3 2">
                </path>
              </svg>Walks that fit your time</li>
          </ul>
        </div>

        <div className={styles.stage} role="img" aria-label="Illustrative preview of the CITYWALK app showing a walking route and audio stories">
          <div className={styles.badge + " " + styles.b1}>
            <i>🎧</i>Local story ready</div>
          <div className={styles.phone}>
            <div className={styles.screen}>
              <div className={styles.notch}>
              </div>
              <div className={styles.map}>
                <svg viewBox="0 0 290 618" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <g fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" opacity=".85">
                    <path d="M-10 150 Q120 120 300 190">
                    </path>
                    <path d="M40 -10 Q70 200 30 400">
                    </path>
                    <path d="M-10 330 Q150 300 300 360">
                    </path>
                    <path d="M200 -10 Q230 150 190 330">
                    </path>
                  </g>
                  <path d="M52 380 C70 300 120 290 150 240 S230 170 220 110" fill="none" stroke="#0967C8" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 12">
                  </path>
                  <circle cx="52" cy="380" r="9" fill="#082A5E">
                  </circle>
                  <circle cx="150" cy="240" r="9" fill="#0967C8" stroke="#fff" strokeWidth="3">
                  </circle>
                  <circle cx="220" cy="110" r="9" fill="#0967C8" stroke="#fff" strokeWidth="3">
                  </circle>
                </svg>
              </div>
              <div className={styles.tag}>
                <span>Old Town</span>
                <span>Walking</span>
              </div>
              <div className={styles.sheet}>
                <small>Your walk</small>
                <h2>Old Town highlights</h2>
                <div className={styles.row}>
                  <span className={styles.dot}>1</span>Start at the market square</div>
                <div className={styles.row}>
                  <span className={styles.dot}>2</span>Hidden courtyard story</div>
                <div className={styles.row}>
                  <span className={styles.dot}>3</span>Harbour viewpoint</div>
              </div>
            </div>
          </div>
          <div className={styles.badge + " " + styles.b2}>
            <i>🧭</i>Walk built for you</div>
          <span className={styles.note}>Illustrative UI – not a final screenshot</span>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className={styles.sec + " " + styles.alt} id="how">
      <div className={styles.in + " " + styles.center}>
        <p className={styles.eyebrow}>How CITYWALK works</p>
        <h2 className={styles.big}>Your time. Your interests. Your walk.</h2>
        <p className={styles.sub}>Three simple steps from “I have a few hours” to a route that fits.</p>
        <div className={styles.steps + " " + styles.alignLeft}>
          <div className={styles.step}>
            <div className={styles.n}>1</div>
            <h3>Choose your time</h3>
            <p>Tell CITYWALK how long you have and when you want to be back.</p>
            <div className={styles.ill}>
              <span className={styles.pill + " " + styles.on}>2 h 30 min</span>
              <span className={styles.pill}>Back by 17:00</span>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.n}>2</div>
            <h3>Pick your interests</h3>
            <p>History, architecture, culture or hidden gems – you decide.</p>
            <div className={styles.ill}>
              <span className={styles.pill + " " + styles.on}>History</span>
              <span className={styles.pill + " " + styles.on}>Architecture</span>
              <span className={styles.pill}>Culture</span>
              <span className={styles.pill}>Hidden gems</span>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.n}>3</div>
            <h3>Preview and go</h3>
            <p>Check your personalized route, then start exploring.</p>
            <div className={styles.ill}>
              <svg viewBox="0 0 200 90" width="100%" height="90" aria-hidden="true">
                <path d="M15 70C40 20 70 80 100 40S160 10 185 30" fill="none" stroke="#0967C8" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round">
                </path>
                <circle cx="15" cy="70" r="7" fill="#082A5E">
                </circle>
                <circle cx="100" cy="40" r="7" fill="#0967C8">
                </circle>
                <circle cx="185" cy="30" r="7" fill="#0967C8">
                </circle>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PersonalizedWalks() {
  return (
    <section className={styles.sec} id="walks">
      <div className={styles.in + " " + styles.split}>
        <div>
          <p className={styles.eyebrow}>Personalized walks</p>
          <h2 className={styles.big}>Every walk should feel like yours.</h2>
          <p className={styles.sub}>Plan around the time you actually have, not around a fixed tour.</p>
          <ul className={styles.list}>
            <li>
              <span>
              </span>
              <div>
                <b>Personalized routes</b>Built from your interests.</div>
            </li>
            <li>
              <span>
              </span>
              <div>
                <b>Time-based planning</b>Short stroll or long afternoon.</div>
            </li>
            <li>
              <span>
              </span>
              <div>
                <b>Estimated return time</b>Know when you’ll be back.</div>
            </li>
            <li>
              <span>
              </span>
              <div>
                <b>Walking preferences</b>Choose the pace that suits you.</div>
            </li>
            <li>
              <span>
              </span>
              <div>
                <b>Cycling options</b>Only where supported.</div>
            </li>
          </ul>
        </div>
        <div>
          <div className={styles.panel}>
            <span className={styles.tagi}>Illustrative interface</span>
            <h3 className={styles.planHeading}>Plan your walk</h3>
            <div className={styles.field}>
              <span>Time available</span>
              <span>2 h 30 min</span>
            </div>
            <div className={styles.bar}>
              <i>
              </i>
            </div>
            <div className={styles.field}>
              <span>Return by</span>
              <span>17:00</span>
            </div>
            <div className={styles.field}>
              <span>Interests</span>
              <span>History · Architecture</span>
            </div>
            <div className={styles.field}>
              <span>Mode</span>
              <span>Walking</span>
            </div>
            <div className={styles.field}>
              <span>Estimated return</span>
              <span>16:45</span>
            </div>
            <Link className={styles.btn + " " + styles.btnPrimary + " " + styles.wideCta} href="/explore" prefetch={false}>Preview route</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section className={styles.sec + " " + styles.alt} id="features">
      <div className={styles.in}>
        <div className={styles.center}>
          <p className={styles.eyebrow}>Discover more as you walk</p>
          <h2 className={styles.big}>Every place has a story.</h2>
          <p className={styles.sub}>Availability depends on city, language and your access. Examples below are illustrative.</p>
        </div>
        <div className={styles.three}>
          <div className={styles.demo + " " + styles.d1}>
            <h3>Local Stories</h3>
            <p>Discover the history and meaning behind the places you visit.</p>
            <div className={styles.mini}>
              <span className={styles.tagi}>Illustrative</span>
              <br />
              <b>Holstentor</b>
              <br />A short story card about why the gate matters to the city, with the key facts at a glance.</div>
          </div>
          <div className={styles.demo + " " + styles.d2}>
            <h3>Audio Experiences</h3>
            <p>Listen to stories when audio is available in your selected language.</p>
            <div className={styles.mini}>
              <span className={styles.tagi}>Illustrative</span>
              <div className={styles.wave} aria-hidden="true">
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
                <i>
                </i>
              </div>
              <b>Story audio player</b>
            </div>
          </div>
          <div className={styles.demo + " " + styles.d3}>
            <h3>Ask CITYWALK</h3>
            <p>AI-powered, place-specific information where the guide is available and access is permitted.</p>
            <div className={styles.mini}>
              <span className={styles.tagi}>Illustrative</span>
              <div className={styles.msg + " " + styles.q}>What am I looking at?</div>
              <div className={styles.msg + " " + styles.a}>A place-specific answer appears here when the guide is available.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Cities() {
  return (
    <section className={styles.sec} id="cities">
      <div className={styles.in}>
        <div className={styles.center}>
          <p className={styles.eyebrow}>Explore cities</p>
          <h2 className={styles.big}>Your next discovery starts here.</h2>
          <p className={styles.sub}>{launchDescription}</p>
        </div>
        <CityCards />
      </div>
    </section>
  );
}

export function WhyCitywalk() {
  return (
    <section className={styles.sec + " " + styles.noTopPadding} id="why">
      <div className={styles.why}>
        <div>
          <p className={styles.eyebrow}>Why CITYWALK?</p>
          <h2 className={styles.big}>Less planning. More exploring.</h2>
          <p className={styles.sub}>Spend your time in the city, not on research.</p>
        </div>
        <div className={styles.wl}>
          <div>
            <small>01</small>Explore at your own pace</div>
          <div>
            <small>02</small>Discover meaningful local places</div>
          <div>
            <small>03</small>Plan around your available time</div>
          <div>
            <small>04</small>Get personalized experiences</div>
          <div>
            <small>05</small>Enjoy local stories</div>
          <div>
            <small>06</small>Keep walking and discovering</div>
        </div>
      </div>
    </section>
  );
}

export function CityPass() {
  return (
    <section className={styles.sec + " " + styles.alt} id="pass">
      <div className={styles.in}>
        <div className={styles.center}>
          <p className={styles.eyebrow}>Free and City Pass</p>
          <h2 className={styles.big}>Explore freely. Discover even more.</h2>
          <p className={styles.sub}>Purchases are planned as native Apple and Google in-app purchases. There is no website checkout.</p>
        </div>
        <div className={styles.cmp}>
          <div className={styles.plan}>
            <span className={styles.tagi}>Free Discovery</span>
            <h3>Start exploring</h3>
            <ul>
              <li>Discover supported public content</li>
              <li>See what CITYWALK offers in Lübeck</li>
            </ul>
            <small>Exact free scope is confirmed at app launch.</small>
          </div>
          <div className={styles.plan + " " + styles.pro}>
            <span className={styles.tagi}>CITYWALK City Pass · planned</span>
            <h3>Discover even more</h3>
            <ul>
              <li>Extended city experiences, subject to actual product availability</li>
              <li>Access verified securely by the app stores</li>
            </ul>
            <small>Features, prices and availability will be shown in the app once live.</small>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Download() {
  return (
    <section className={styles.sec} id="download">
      <div className={styles.dl}>
        <div className={styles.downloadCopy}>
          <p className={styles.eyebrow + " " + styles.downloadEyebrow}>Download CITYWALK</p>
          <h2 className={styles.big}>Your next adventure is closer than you think.</h2>
          <p className={styles.sub}>The native app is preparing for launch. Store links will appear here once the listings are live and verified.</p>
          <div className={styles.plat}>
            <span>iPhone · prelaunch</span>
            <span>Android · prelaunch</span>
          </div>
          <Link className={styles.btn + " " + styles.btnGhost} href="/explore" prefetch={false}>Explore public content</Link>
        </div>
        <figure className={styles.appIllustration}>
          <Image src="/images/landing-next/citywalk-app-illustration.webp" width={900} height={822} alt="Illustrative CITYWALK app showing a Lübeck Old Town walk with route map and highlights" sizes="(max-width: 1024px) 100vw, 560px" unoptimized />
          <figcaption>Illustrative UI – not a final app screenshot</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className={styles.sec + " " + styles.alt} id="faq">
      <div className={styles.in + " " + styles.center}>
        <p className={styles.eyebrow}>FAQ</p>
        <h2 className={styles.big}>Good to know.</h2>
        <div className={styles.faqs + " " + styles.alignLeft}>
          <details name="citywalk-faq">
            <summary>What is CITYWALK?</summary>
            <p>A city discovery app for personal walks, local stories and place information, starting in Lübeck.</p>
          </details>
          <details name="citywalk-faq">
            <summary>Is CITYWALK free?</summary>
            <p>There is a free discovery experience. Paid extras are planned through the City Pass; details are confirmed in the app.</p>
          </details>
          <details name="citywalk-faq">
            <summary>How do personalized walks work?</summary>
            <p>You set your available time, return time and interests, then preview a route before you start.</p>
          </details>
          <details name="citywalk-faq">
            <summary>Which cities are supported?</summary>
            <p>{cityAnswer}</p>
          </details>
          <details name="citywalk-faq">
            <summary>Is CITYWALK available on iPhone and Android?</summary>
            <p>Both are planned. The app is preparing for launch and no store listings are live yet.</p>
          </details>
          <details name="citywalk-faq">
            <summary>Does CITYWALK work offline?</summary>
            <p>We don’t promise offline use. Check the app at launch for what needs a connection.</p>
          </details>
          <details name="citywalk-faq">
            <summary>Are Stories, Audio and the AI Guide available everywhere?</summary>
            <p>No. They depend on the place, language and your access.</p>
          </details>
          <details name="citywalk-faq">
            <summary>What is a City Pass?</summary>
            <p>A planned in-app purchase for extra city content, bought natively through Apple or Google. Not available yet.</p>
          </details>
          <details name="citywalk-faq">
            <summary>Do I need an account?</summary>
            <p>Public content is meant to be explorable without one. Some features may require an account; this is confirmed at launch.</p>
          </details>
        </div>
      </div>
    </section>
  );
}
