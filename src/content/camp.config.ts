/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ASTRO SPACE CAMP 2027: EVERYTHING EDITABLE LIVES IN THIS ONE FILE
 * ─────────────────────────────────────────────────────────────────────────────
 *  How to edit (no coding knowledge needed):
 *    • Change text between quotes '…'. Keep the quotes and the comma at the end.
 *    • Dates are 'YYYY-MM-DD'. Times are 'HH:MM' (24-hour, India time).
 *    • `null` means "not decided yet": the site shows a friendly placeholder.
 *    • Save, then run `npm run build`. The night-sky, itinerary moonrise times,
 *      search-engine data and every date on the page update automatically.
 *  See README.md → "Editing content" for screenshots of where each item appears.
 */

export type Batch = {
  id: string
  label: string
  /** First day (arrival) and last day (departure), 'YYYY-MM-DD'. */
  start: string
  end: string
  /** While true, every mention of these dates carries a "Tentative" badge. */
  tentative: boolean
  /** Part of the sky the hero features for this batch, degrees from north (90 = east, 180 = south).
   *  Batch 1 → 172 (Southern Cross & Centaurus); Batch 2 → 130 (the rising Moon and Scorpius). */
  skyViewAzimuth: number
  /** Optional per-batch registration link. Falls back to links.register, then WhatsApp. */
  registerUrl: string | null
}

export type Price = { amount: number | null; label: string; until?: string | null }

/** The two parallel tracks students pick between. Same nine days, different depth of build. */
export type Track = {
  id: string
  label: string
  line: string
  /** This track's fee. Keep both amounts null until the organisers sign the numbers off. */
  earlyBird: Price
  regular: Price
}

export type ItineraryDay = {
  /** Headline for the day, shown to everyone. */
  theme: string
  /** What each track builds when the two differ. Both null = the whole camp does `theme` together. */
  advanced: string | null
  basic: string | null
}

export type FaqItem = {
  q: string
  a: string
  /** false → shows a small "To be confirmed" tag. Set true once organisers sign off. */
  confirmed: boolean
}

export type Photo = {
  /** Path under /public, e.g. '/photos/build-01.jpg'. null shows a labelled placeholder slot. */
  src: string | null
  alt: string
  caption: string
  width?: number
  height?: number
}

export const camp = {
  name: 'Astro Space Camp 2027',
  shortName: 'Astro Space Camp',
  year: 2027,
  since: 2017,
  edition: 11, // 11th year

  organizers: [
    { name: 'Genex Space', role: 'ISRO educational content partner', url: 'https://genex.space', logo: null as string | null },
    { name: 'SSERD', fullName: 'Society for Space Education Research and Development', role: 'ISRO Space Tutor', url: 'https://sserd.org', logo: null as string | null },
  ],

  /** Keep the existing ASC logo: drop the file in /public/brand and set the path here. */
  brand: {
    ascLogo: '/brand/asc-logo.svg' as string | null,
    /** The logo file's own width/height (any units). Lets the browser reserve its space before it loads. */
    ascLogoSize: { width: 3309, height: 608 },
  },

  format: { residential: true, days: 9, nights: 8 },
  grades: { from: 7, to: 12 },

  batches: [
    { id: 'batch-1', label: 'Batch 1', start: '2027-04-23', end: '2027-05-01', tentative: false, skyViewAzimuth: 172, registerUrl: null },
    { id: 'batch-2', label: 'Batch 2', start: '2027-06-25', end: '2027-07-03', tentative: false, skyViewAzimuth: 130, registerUrl: null },
  ] satisfies Batch[],

  /**
   * Both tracks run side by side for all nine days: same campus, same sky, same astronaut
   * training and meteorite hunt. They differ on four build days (2, 5, 7 and 8).
   */
  tracks: [
    {
      id: 'advanced',
      label: 'Advanced',
      line: 'Astrophotography, a radio-controlled aircraft, recovery rockets and a working ground station.',
      earlyBird: { amount: null, label: 'Early bird', until: null } as Price,
      regular: { amount: null, label: 'Regular' } as Price,
    },
    {
      id: 'basic',
      label: 'Basic',
      line: 'Sky gazing with real instruments, a chuck glider, C-class rockets and a CubeSat build.',
      earlyBird: { amount: null, label: 'Early bird', until: null } as Price,
      regular: { amount: null, label: 'Regular' } as Price,
    },
  ] satisfies Track[],

  /**
   * Fees are NOT decided. The amounts live on each track above, in `tracks[].earlyBird` and
   * `tracks[].regular`, so a new track cannot be added without a price. While every amount is
   * null the site shows `pendingMessage` and publishes no price in the search-engine data.
   */
  fees: {
    currency: 'INR',
    pendingMessage: 'Fees announcing soon',
  },

  venue: {
    name: 'Agastya International Foundation campus',
    town: 'Kuppam',
    district: 'Chittoor',
    state: 'Andhra Pradesh',
    country: 'IN',
    // NOTE: brief says 200-acre; Wikipedia says ~172 acres. See NOTES.md before launch.
    campusArea: '200-acre campus',
    darkSkies: true,
    latitude: 12.75,
    longitude: 78.34,
    pickup: 'Pickup and drop from Bengaluru on request',
    airport: { name: 'Kempegowda International Airport, Bengaluru', code: 'BLR' },
    rail: { name: 'Kuppam railway station', code: 'KPN' },
  },

  /** The "night one" sky is rendered at this local time on each batch's first night. */
  sky: {
    nightOneTime: '21:00',
    utcOffset: '+05:30',
    timezoneLabel: 'IST',
    /** true: phones get the live 3D sky (the brief's default). false: phones get the still image of
     *  the same computed sky, which loads instantly and scored 97–100 on Lighthouse mobile (see NOTES.md). */
    liveOnMobile: true,
  },

  /** One line under the hero headline: what the camp actually teaches (it is not only astronomy). */
  heroSubline: 'They’ll build rockets, design satellites, learn how aircraft fly, and learn to read this sky.',

  /**
   * The four subjects, ordered by altitude (the page "ascends" through them).
   * `activities` are shown as chips: list only things the camp really does.
   */
  disciplines: [
    {
      key: 'aircraft',
      title: 'Aircraft',
      altitude: '≈ 11 km',
      altitudeNote: 'where airliners cruise',
      line: 'How aircraft fly.',
      body: 'Lift, drag, thrust and control: the principles of flight behind every aeroplane, and how engineers design for them.',
      activities: ['RC plane build & flight test', 'Chuck glider build & flight test'],
    },
    {
      key: 'rockets',
      title: 'Rockets',
      altitude: '100 km',
      altitudeNote: 'the Kármán line, where space begins',
      line: 'Build it. Launch it.',
      body: 'Thrust, stability and recovery: students build their own model rocket from a DIY kit, count it down and launch it.',
      activities: ['Recovery rockets', 'C-class model rockets'],
    },
    {
      key: 'satellites',
      title: 'Satellites',
      altitude: '≈ 400 km',
      altitudeNote: 'low Earth orbit',
      line: 'Design the payload. Track the pass.',
      body: 'What a satellite carries and why, and how a ground station finds one crossing the sky at 7–8 km every second.',
      activities: ['CubeSat build', 'Ground station build & live satellite tracking'],
    },
    {
      key: 'astronomy',
      title: 'Astronomy',
      altitude: 'Light-years',
      altitudeNote: 'the night sky over Kuppam',
      line: 'Read the sky.',
      body: 'Constellations, planets and the Moon from a dark campus, plus a hunt for meteorites on the ground.',
      activities: ['Astrophotography', 'Night sky gazing & astronomical instruments', 'Meteorite hunting'],
    },
  ],
  /** Shown under the four subjects. */
  acrossSubjects: ['Astronaut-style training', 'Live experiments & simulations', 'Guest speakers from the space sector'],

  stats: [
    { value: 11, suffix: '', label: 'years running', note: 'since 2017' },
    { value: 2000, suffix: '+', label: 'students', note: 'across previous camps' },
    { value: 50, suffix: '+', label: 'camps', note: 'completed' },
    { value: 20, suffix: '+', label: 'scholarships', note: 'awarded' },
  ],

  lbl: [
    {
      key: 'learn',
      title: 'Learn',
      line: 'Understand how it works before you touch it.',
      body: 'Working principles, the materials engineers actually use, and the safety rules that keep a launch pad calm.',
    },
    {
      key: 'build',
      title: 'Build',
      line: 'Make the model. Make the experiment.',
      body: 'Every student builds with their own hands and their own DIY kit: rockets, payloads, instruments.',
    },
    {
      key: 'launch',
      title: 'Launch',
      line: 'Fly it, operate it, analyse what happened.',
      body: 'Countdown, launch, recovery, then the data: what worked, what didn’t, and what to change next time.',
    },
  ],

  highlights: [
    'Experience centre & field trip',
    'Astrophotography & night sky gazing',
    'Astronaut training',
    'RC plane & chuck glider builds',
    'Meteorite hunting',
    'Recovery & C-class rockets',
    'CubeSat build',
    'Ground station & live satellite tracking',
    'Guest speakers from the space sector',
  ],

  inclusions: [
    'Training',
    'Certificate of participation',
    'All materials & DIY kits',
    'Boarding',
    'Vegetarian food',
    'Genex Space Store vouchers',
    'Goodies',
    '24/7 security',
  ],

  /**
   * The nine days, in order. `advanced`/`basic` are filled in only on the days the two tracks
   * split; leave both null and everyone does `theme` together.
   */
  itinerary: [
    { theme: 'Experience centre & field trip', advanced: null, basic: null },
    { theme: 'Under the night sky', advanced: 'Astrophotography', basic: 'Sky gazing & astronomical instruments' },
    { theme: 'Rest day', advanced: null, basic: null },
    { theme: 'Astronaut training', advanced: null, basic: null },
    { theme: 'Principles of flight', advanced: 'RC plane build & flight test', basic: 'Chuck glider build & flight test' },
    { theme: 'Meteorite hunting', advanced: null, basic: null },
    { theme: 'Rocketry', advanced: 'Recovery rockets', basic: 'C-class rockets' },
    { theme: 'Satellites', advanced: 'Ground station build & live tracking', basic: 'CubeSat build' },
    { theme: 'Closing day', advanced: null, basic: null },
  ] satisfies ItineraryDay[],

  faq: [
    {
      q: 'Is the camp safe? Who looks after the students?',
      a: 'Students live and learn on the Agastya International Foundation campus in Kuppam, which has 24/7 security. Every activity starts with the Learn stage, where students are taught the safety rules before anything is built or launched.',
      confirmed: true,
    },
    {
      q: 'What is the student-to-staff ratio?',
      a: 'The organisers will publish the supervision ratio with the final schedule. Ask us on WhatsApp for the latest.',
      confirmed: false,
    },
    {
      q: 'What will my child eat?',
      a: 'All meals are vegetarian and included in the camp. Tell us about allergies or dietary needs when you register.',
      confirmed: true,
    },
    {
      q: 'Can students keep their phones?',
      a: 'The phone policy and parent call times will be shared before the camp. Ask us on WhatsApp if you need a decision now.',
      confirmed: false,
    },
    {
      q: 'What happens if my child falls ill?',
      a: 'The medical support arrangements and nearest-hospital details will be shared with registered families before the camp. Please declare any medical conditions at registration.',
      confirmed: false,
    },
    {
      q: 'What is the refund and cancellation policy?',
      a: 'The refund policy will be published together with the fees.',
      confirmed: false,
    },
    {
      q: 'What should we pack?',
      a: 'A packing list will be sent after registration. Expect to need comfortable clothes for 9 days, a water bottle, a cap, a notebook, and a warm layer for night-sky sessions.',
      confirmed: false,
    },
    {
      q: 'How do we get to Kuppam?',
      a: 'Pickup and drop from Bengaluru is available on request. The nearest airport is Bengaluru (BLR) and the nearest railway station is Kuppam (KPN).',
      confirmed: true,
    },
    {
      q: 'Are the dates final?',
      a: 'Yes. Both batches are confirmed: nine days and eight nights each. You will find the dates on every batch card on this page, and joining details follow once you register.',
      confirmed: true,
    },
  ] satisfies FaqItem[],

  contact: {
    /** International format without spaces or '+' for WhatsApp links. VERIFY BEFORE LAUNCH. */
    whatsapp: '918147619141',
    whatsappDisplay: '+91 81476 19141',
    email: null as string | null,
  },

  links: {
    /** Registration form. While null, "Register" opens WhatsApp with a pre-filled message. */
    register: null as string | null,
    /** Payment link, shown on batch cards once set. */
    pay: null as string | null,
    /** Newsletter form endpoint (POST, field "email"). While null the form explains sign-up opens soon. */
    newsletterEndpoint: null as string | null,
    socials: [
      { label: 'Facebook', url: 'https://www.facebook.com/astrospacecamp.sserd/' },
    ] as Array<{ label: string; url: string }>,
  },

  /** Real camp photos only (previous editions). null → labelled placeholder. */
  photos: {
    learn: { src: null, alt: '', caption: 'Learn stage: classroom session' } as Photo,
    build: { src: null, alt: '', caption: 'Build stage: rocket assembly' } as Photo,
    launch: { src: null, alt: '', caption: 'Launch stage: on the pad' } as Photo,
    wall: [
      { src: null, alt: '', caption: 'Rocket launch' },
      { src: null, alt: '', caption: 'Ground station' },
      { src: null, alt: '', caption: 'Night sky session' },
      { src: null, alt: '', caption: 'Payload team' },
      { src: null, alt: '', caption: 'Meteorite hunt' },
      { src: null, alt: '', caption: 'Graduation' },
      { src: null, alt: '', caption: 'Campus' },
      { src: null, alt: '', caption: 'Guest speaker' },
    ] as Photo[],
  },

  /** Add real quotes from previous campers/parents here. Empty → an invitation to share is shown. */
  testimonials: [] as Array<{ quote: string; name: string; detail: string }>,

  site: {
    url: 'https://www.astrospacecamp.com',
    title: 'Astro Space Camp 2027: rockets, satellites, aircraft & astronomy | Grades 7–12, Kuppam',
    description:
      'India’s longest-running residential space camp for school students: 9 days of rockets, satellites, aircraft and astronomy at the Agastya campus, Kuppam. Build and launch rockets, design satellite payloads, learn how aircraft fly, track satellites and study the night sky. Grades 7–12.',
    ogImage: '/og.jpg',
    locale: 'en_IN',
  },
} as const

export type Camp = typeof camp
