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
  brand: { ascLogo: null as string | null },

  format: { residential: true, days: 9, nights: 8 },
  grades: { from: 7, to: 12 },

  batches: [
    { id: 'batch-1', label: 'Batch 1', start: '2027-04-27', end: '2027-05-05', tentative: true, skyViewAzimuth: 172, registerUrl: null },
    { id: 'batch-2', label: 'Batch 2', start: '2027-06-20', end: '2027-06-28', tentative: true, skyViewAzimuth: 130, registerUrl: null },
  ] satisfies Batch[],

  /** Fees are NOT decided. Leave amount: null until they are; the site says "Announcing soon". */
  fees: {
    currency: 'INR',
    earlyBird: { amount: null, label: 'Early bird', until: null } as Price,
    regular: { amount: null, label: 'Regular' } as Price,
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
      activities: [] as string[], // e.g. 'Glider build & flight test'; add once the schedule is final
    },
    {
      key: 'rockets',
      title: 'Rockets',
      altitude: '100 km',
      altitudeNote: 'the Kármán line, where space begins',
      line: 'Build it. Launch it.',
      body: 'Thrust, stability and recovery: students build their own model rocket from a DIY kit, count it down and launch it.',
      activities: ['Model rocket build & launch'],
    },
    {
      key: 'satellites',
      title: 'Satellites',
      altitude: '≈ 400 km',
      altitudeNote: 'low Earth orbit',
      line: 'Design the payload. Track the pass.',
      body: 'What a satellite carries and why, and how a ground station finds one crossing the sky at 7–8 km every second.',
      activities: ['Satellite payload design', 'Live satellite tracking via ground station'],
    },
    {
      key: 'astronomy',
      title: 'Astronomy',
      altitude: 'Light-years',
      altitudeNote: 'the night sky over Kuppam',
      line: 'Read the sky.',
      body: 'Constellations, planets and the Moon from a dark campus, plus a hunt for meteorites on the ground.',
      activities: ['Night sky gazing', 'Meteorite hunting'],
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
    'Principles of flight & aircraft design',
    'Model rocket build & launch',
    'Satellite payload design',
    'Live satellite tracking via ground station',
    'Astronaut-style training',
    'Meteorite hunting',
    'Night sky gazing',
    'Live experiments & simulations',
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

  /** Day themes are placeholders until the schedule is final. Replace null with e.g. 'Rocketry I'. */
  itineraryThemes: [null, null, null, null, null, null, null, null, null] as Array<string | null>,

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
      a: 'Not yet. Both batches are tentative and will be confirmed by the organisers. Register your interest and we will message you the moment they are fixed.',
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
