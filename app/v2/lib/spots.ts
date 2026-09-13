/**
 * Seed data.
 *
 * Deliberately local and specific. The thing this product has that nothing else
 * does is Mumbaikars' knowledge of Mumbai — not a random-dare generator. So the
 * content model is a real place or a real thing to do in a named neighbourhood,
 * with the information that actually decides whether you go: how long it takes,
 * whether it is open, whether rain ruins it.
 *
 * These run locally so the concept can be clicked through without touching the
 * production database. In the real thing these are rows, contributed by users.
 */

export type Area =
  | 'Colaba'
  | 'Fort'
  | 'Marine Drive'
  | 'Girgaon'
  | 'Byculla'
  | 'Dadar'
  | 'Matunga'
  | 'Mahim'
  | 'Bandra'
  | 'Worli'
  | 'Andheri'
  | 'Juhu'
  | 'Powai'
  | 'Borivali';

/** Mumbai runs south to north. The Log leans on this ordering. */
export const AREAS_SOUTH_TO_NORTH: Area[] = [
  'Colaba',
  'Fort',
  'Marine Drive',
  'Girgaon',
  'Byculla',
  'Dadar',
  'Matunga',
  'Mahim',
  'Bandra',
  'Worli',
  'Andheri',
  'Juhu',
  'Powai',
  'Borivali',
];

export type Kind = 'eat' | 'walk' | 'look' | 'sit' | 'buy' | 'do';

export const KIND_LABEL: Record<Kind, string> = {
  eat: 'Eat',
  walk: 'Walk',
  look: 'Look',
  sit: 'Sit',
  buy: 'Buy',
  do: 'Do',
};

export interface Spot {
  id: string;
  name: string;
  area: Area;
  /** One line. Why a person who lives here would send you. */
  line: string;
  kind: Kind;
  /** Minutes you'd realistically spend there, travel excluded. */
  minutes: number;
  /** Rain makes this a bad idea. */
  outdoor: boolean;
  /** Local hours, 24h. Open across midnight is expressed as opens > closes. */
  opens: number;
  closes: number;
  /** Roughly what it costs, in rupees. 0 means free. */
  rupees: number;
  /** The handle that contributed it. The credit is the point. */
  addedBy: string;
  /** Good reason to go alone, or better with someone. */
  betterWith?: boolean;
}

export const SPOTS: Spot[] = [
  {
    id: 'kyani',
    name: 'Kyani & Co.',
    area: 'Girgaon',
    line: 'Irani cafe from 1904. Bun maska and chai, marble tables, nobody rushes you.',
    kind: 'eat',
    minutes: 40,
    outdoor: false,
    opens: 7,
    closes: 20,
    rupees: 150,
    addedBy: 'farhan',
  },
  {
    id: 'banganga',
    name: 'Banganga Tank',
    area: 'Girgaon',
    line: 'A stone water tank from 1127 hidden behind Malabar Hill. Complete silence, ten minutes from the traffic.',
    kind: 'look',
    minutes: 45,
    outdoor: true,
    opens: 6,
    closes: 20,
    rupees: 0,
    addedBy: 'priya_w',
  },
  {
    id: 'sassoon',
    name: 'Sassoon Dock at dawn',
    area: 'Colaba',
    line: 'Go at 5:30am when the boats come in. Loudest, most alive place in the city. Wear shoes you do not like.',
    kind: 'look',
    minutes: 60,
    outdoor: true,
    opens: 4,
    closes: 9,
    rupees: 0,
    addedBy: 'imran',
  },
  {
    id: 'kalaghoda-walk',
    name: 'Kala Ghoda after the shops shut',
    area: 'Fort',
    line: 'The Art Deco and Gothic facades with nobody in front of them. Best after 9pm on a weeknight.',
    kind: 'walk',
    minutes: 40,
    outdoor: true,
    opens: 20,
    closes: 24,
    rupees: 0,
    addedBy: 'devika',
  },
  {
    id: 'sarvi',
    name: 'Sarvi',
    area: 'Byculla',
    line: 'Seekh kebabs since 1921, in a lane you would never turn down. Order the baida roti too.',
    kind: 'eat',
    minutes: 50,
    outdoor: false,
    opens: 12,
    closes: 24,
    rupees: 300,
    addedBy: 'imran',
    betterWith: true,
  },
  {
    id: 'bhau-daji',
    name: 'Bhau Daji Lad Museum',
    area: 'Byculla',
    line: 'The city museum almost nobody goes to. Restored interiors, dioramas of old Bombay trades. Closed Wednesdays.',
    kind: 'look',
    minutes: 75,
    outdoor: false,
    opens: 10,
    closes: 18,
    rupees: 100,
    addedBy: 'devika',
  },
  {
    id: 'marine-wall',
    name: 'Sit on the Marine Drive wall',
    area: 'Marine Drive',
    line: 'Not a walk. Pick a spot on the tetrapods, face the sea, stay an hour. It works every single time.',
    kind: 'sit',
    minutes: 60,
    outdoor: true,
    opens: 0,
    closes: 24,
    rupees: 0,
    addedBy: 'sayyam',
  },
  {
    id: 'cafe-madras',
    name: 'Cafe Madras',
    area: 'Matunga',
    line: 'Filter coffee and a masala dosa in a room that has not changed since 1940. Queue outside on Sundays is worth it.',
    kind: 'eat',
    minutes: 45,
    outdoor: false,
    opens: 7,
    closes: 22,
    rupees: 250,
    addedBy: 'ganesh_m',
  },
  {
    id: 'matunga-market',
    name: 'Matunga flower market, early',
    area: 'Matunga',
    line: 'Before 8am the whole street is jasmine and marigold being strung by hand. Buy a mogra for twenty rupees.',
    kind: 'buy',
    minutes: 30,
    outdoor: true,
    opens: 5,
    closes: 10,
    rupees: 20,
    addedBy: 'ganesh_m',
  },
  {
    id: 'five-gardens',
    name: 'Five Gardens',
    area: 'Matunga',
    line: 'Parsi colony streets with actual trees and actual quiet. Do a loop. Nobody will bother you.',
    kind: 'walk',
    minutes: 35,
    outdoor: true,
    opens: 5,
    closes: 23,
    rupees: 0,
    addedBy: 'priya_w',
  },
  {
    id: 'shivaji-park',
    name: 'Shivaji Park at 6am',
    area: 'Dadar',
    line: 'Twelve cricket games at once, walkers doing laps, the whole neighbourhood awake before you are.',
    kind: 'look',
    minutes: 40,
    outdoor: true,
    opens: 5,
    closes: 10,
    rupees: 0,
    addedBy: 'sayyam',
  },
  {
    id: 'dadar-phool',
    name: 'Dadar Phool Galli',
    area: 'Dadar',
    line: 'The wholesale flower market under the bridge. Go at 6am and it is a wall of colour and shouting.',
    kind: 'look',
    minutes: 35,
    outdoor: true,
    opens: 4,
    closes: 11,
    rupees: 0,
    addedBy: 'farhan',
  },
  {
    id: 'aaswad',
    name: 'Aaswad',
    area: 'Dadar',
    line: 'Misal that will genuinely hurt you, and piyush to put the fire out. Go hungry, go early.',
    kind: 'eat',
    minutes: 40,
    outdoor: false,
    opens: 8,
    closes: 22,
    rupees: 200,
    addedBy: 'ganesh_m',
    betterWith: true,
  },
  {
    id: 'mahim-dargah',
    name: 'Mahim Dargah lane on a Thursday',
    area: 'Mahim',
    line: 'Qawwali, rose petals, and a lane of stalls. Go on Thursday evening when it is at full volume.',
    kind: 'look',
    minutes: 50,
    outdoor: true,
    opens: 17,
    closes: 23,
    rupees: 0,
    addedBy: 'imran',
  },
  {
    id: 'mahim-nature',
    name: 'Maharashtra Nature Park',
    area: 'Mahim',
    line: 'A forest built on a rubbish dump, next to the Dharavi link road. Butterflies, herons, and nobody there.',
    kind: 'walk',
    minutes: 60,
    outdoor: true,
    opens: 9,
    closes: 18,
    rupees: 50,
    addedBy: 'priya_w',
  },
  {
    id: 'bandra-walls',
    name: 'Chapel Road walls',
    area: 'Bandra',
    line: 'Street art down the whole lane, changing every few months. Ten minutes off Hill Road and completely different.',
    kind: 'walk',
    minutes: 35,
    outdoor: true,
    opens: 7,
    closes: 22,
    rupees: 0,
    addedBy: 'devika',
  },
  {
    id: 'bandstand-rocks',
    name: 'Bandstand rocks, late',
    area: 'Bandra',
    line: 'Past the promenade, down onto the rocks. After 11pm it is just the sea and a few people not talking.',
    kind: 'sit',
    minutes: 45,
    outdoor: true,
    opens: 21,
    closes: 24,
    rupees: 0,
    addedBy: 'sayyam',
  },
  {
    id: 'american-express',
    name: 'American Express Bakery',
    area: 'Bandra',
    line: 'Byculla-style bakery running since 1908. Get the ginger biscuits and the brun. Cash only.',
    kind: 'buy',
    minutes: 20,
    outdoor: false,
    opens: 7,
    closes: 21,
    rupees: 120,
    addedBy: 'farhan',
  },
  {
    id: 'worli-village',
    name: 'Worli Koliwada',
    area: 'Worli',
    line: 'A fishing village that predates the city, with the Sea Link right on top of it. Walk to the fort at the end.',
    kind: 'walk',
    minutes: 55,
    outdoor: true,
    opens: 6,
    closes: 20,
    rupees: 0,
    addedBy: 'imran',
  },
  {
    id: 'nehru-planetarium',
    name: 'Nehru Planetarium show',
    area: 'Worli',
    line: 'Forty-five minutes of sky in a dark room. Absurdly good value and almost never full on a weekday.',
    kind: 'do',
    minutes: 60,
    outdoor: false,
    opens: 12,
    closes: 18,
    rupees: 150,
    addedBy: 'devika',
    betterWith: true,
  },
  {
    id: 'gilbert-hill',
    name: 'Gilbert Hill',
    area: 'Andheri',
    line: 'A 200-foot column of volcanic rock, 66 million years old, surrounded by flats. Climb the steps at the side.',
    kind: 'look',
    minutes: 40,
    outdoor: true,
    opens: 7,
    closes: 19,
    rupees: 0,
    addedBy: 'priya_w',
  },
  {
    id: 'juhu-late',
    name: 'Juhu beach, 6am not 6pm',
    area: 'Juhu',
    line: 'Everyone goes at sunset. Go at sunrise instead and you will have most of it to yourself.',
    kind: 'walk',
    minutes: 45,
    outdoor: true,
    opens: 5,
    closes: 9,
    rupees: 0,
    addedBy: 'sayyam',
  },
  {
    id: 'prithvi',
    name: 'Prithvi Theatre cafe',
    area: 'Juhu',
    line: 'Sit in the courtyard with an Irish coffee even if you are not seeing a play. Somebody is always rehearsing.',
    kind: 'sit',
    minutes: 60,
    outdoor: true,
    opens: 10,
    closes: 23,
    rupees: 250,
    addedBy: 'devika',
    betterWith: true,
  },
  {
    id: 'powai-lake',
    name: 'Powai lake promenade',
    area: 'Powai',
    line: 'Crocodiles in there, apparently. Walk the promenade at dusk and watch the hills go dark.',
    kind: 'walk',
    minutes: 45,
    outdoor: true,
    opens: 6,
    closes: 22,
    rupees: 0,
    addedBy: 'ganesh_m',
  },
  {
    id: 'kanheri',
    name: 'Kanheri Caves',
    area: 'Borivali',
    line: '109 caves cut into basalt starting in the 1st century BC, inside a national park. Half a day, and worth it.',
    kind: 'do',
    minutes: 240,
    outdoor: true,
    opens: 7,
    closes: 17,
    rupees: 100,
    addedBy: 'priya_w',
    betterWith: true,
  },
  {
    id: 'borivali-forest',
    name: 'Sanjay Gandhi NP, early gate',
    area: 'Borivali',
    line: 'In the gate by 7am and the tar road through the forest is yours. Leopards are real but shy.',
    kind: 'walk',
    minutes: 120,
    outdoor: true,
    opens: 6,
    closes: 17,
    rupees: 100,
    addedBy: 'farhan',
  },
];

export const isOpenAt = (spot: Spot, hour: number): boolean =>
  spot.opens <= spot.closes
    ? hour >= spot.opens && hour < spot.closes
    : hour >= spot.opens || hour < spot.closes;

/** Rough travel time. Stands in for routing, which the real thing would do. */
export const travelMinutes = (spot: Spot, from: Area): number => {
  const a = AREAS_SOUTH_TO_NORTH.indexOf(from);
  const b = AREAS_SOUTH_TO_NORTH.indexOf(spot.area);
  if (a < 0 || b < 0) return 30;
  const gap = Math.abs(a - b);
  if (gap === 0) return 8;
  return Math.round(10 + gap * 9);
};
