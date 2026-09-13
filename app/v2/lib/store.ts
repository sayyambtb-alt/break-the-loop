import type { Area } from './spots';

/**
 * Local state.
 *
 * Everything here is the user's own record of where they went. Note what is
 * absent: no XP, no level, no rank, no streak, no badge list. That removal is
 * the argument, not an omission — see the note at the top of page.tsx.
 *
 * It lives in localStorage so the concept runs without touching the production
 * database. In the real thing the log is a table, the friend layer is real, and
 * the spots are contributed rows.
 */

export interface LogEntry {
  id: string;
  spotId: string;
  spotName: string;
  area: Area;
  /** ISO timestamp of when you got back. */
  at: string;
  /** Minutes you were actually out. */
  minutes: number;
  /** Your own note. Private by default — this is a diary, not a post. */
  note?: string;
  /** Whether you chose to let friends see it. Default false, deliberately. */
  shared?: boolean;
}

export interface V2State {
  handle: string;
  home: Area;
  log: LogEntry[];
  /** Spots the user added themselves, pending in the real product. */
  contributed: string[];
}

export const STORE_KEY = 'btl_v2_state';

export const EMPTY: V2State = {
  handle: '',
  home: 'Dadar',
  log: [],
  contributed: [],
};

export function load(): V2State {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<V2State>;
    return {
      handle: typeof parsed.handle === 'string' ? parsed.handle : '',
      home: (parsed.home as Area) || 'Dadar',
      log: Array.isArray(parsed.log) ? parsed.log : [],
      contributed: Array.isArray(parsed.contributed) ? parsed.contributed : [],
    };
  } catch {
    // Blocked or corrupt storage should start you clean, not crash you out.
    return EMPTY;
  }
}

export function save(state: V2State) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Private mode. The session still works; it just won't persist.
  }
}

export const visitedIds = (state: V2State): Set<string> =>
  new Set(state.log.map((e) => e.spotId));

export const areasVisited = (state: V2State): Set<Area> =>
  new Set(state.log.map((e) => e.area));

/**
 * The stats the Log shows. Chosen so that none of them can be farmed, and
 * none of them go down if you don't open the app for a month.
 */
export function stats(state: V2State) {
  const areas = areasVisited(state);
  const unique = new Set(state.log.map((e) => e.spotId));
  const minutes = state.log.reduce((sum, e) => sum + (e.minutes || 0), 0);
  return {
    outs: state.log.length,
    areas: areas.size,
    places: unique.size,
    minutes,
    /** Reads as minutes until there is an hour to show, so a first out isn't "0 hours". */
    timeLabel:
      minutes < 60
        ? { n: minutes, unit: minutes === 1 ? 'minute' : 'minutes' }
        : { n: Math.round((minutes / 60) * 10) / 10, unit: 'hours' },
  };
}
