import { describe, it, expect } from 'vitest';
import { SPOTS, isOpenAt, AREAS_SOUTH_TO_NORTH } from '../app/v2/lib/spots';
import {
  offers,
  score,
  countMatches,
  reasonFor,
  isMonsoon,
  BUDGET_MINUTES,
  type Ask,
  type Context,
} from '../app/v2/lib/pick';

const NONE = new Set<string>();

const ask = (over: Partial<Ask> = {}): Ask => ({
  budget: 'hour',
  travel: 'any',
  from: 'Dadar',
  withSomeone: false,
  kinds: [],
  ...over,
});

const ctx = (over: Partial<Context> = {}): Context => ({
  hour: 19,
  day: 5,
  month: 1,
  raining: false,
  ...over,
});

describe('opening hours', () => {
  it('handles a place that closes after midnight', () => {
    const late = { ...SPOTS[0], opens: 21, closes: 2 };
    expect(isOpenAt(late, 23)).toBe(true);
    expect(isOpenAt(late, 1)).toBe(true);
    expect(isOpenAt(late, 5)).toBe(false);
  });
});

describe('what gets offered', () => {
  it('never offers somewhere that is shut', () => {
    // The single most common failure of a random dare generator: sending you
    // to a dawn fish market at 11pm.
    for (const hour of [2, 5, 11, 15, 23]) {
      const c = ctx({ hour });
      for (const o of offers(ask({ budget: 'evening' }), c, NONE, 0, 10)) {
        expect(isOpenAt(o.spot, hour), `${o.spot.name} at ${hour}:00`).toBe(true);
      }
    }
  });

  it('never offers an outdoor plan in the rain', () => {
    const wet = ctx({ raining: true });
    const got = offers(ask({ budget: 'evening' }), wet, NONE, 0, 10);
    expect(got.length).toBeGreaterThan(0);
    for (const o of got) expect(o.spot.outdoor, o.spot.name).toBe(false);
  });

  it('respects the time budget, travel included', () => {
    for (const budget of ['quick', 'hour', 'evening'] as const) {
      for (const o of offers(ask({ budget }), ctx({ hour: 12 }), NONE, 0, 10)) {
        expect(o.total, `${o.spot.name} under ${budget}`).toBeLessThanOrEqual(
          BUDGET_MINUTES[budget]
        );
      }
    }
  });

  it('on foot means your own neighbourhood only', () => {
    const got = offers(ask({ travel: 'foot', from: 'Bandra', budget: 'evening' }), ctx({ hour: 12 }), NONE, 0, 10);
    expect(got.length).toBeGreaterThan(0);
    for (const o of got) expect(o.spot.area).toBe('Bandra');
  });

  it('honours a category filter', () => {
    const got = offers(ask({ kinds: ['eat'], budget: 'evening' }), ctx({ hour: 13 }), NONE, 0, 10);
    expect(got.length).toBeGreaterThan(0);
    for (const o of got) expect(o.spot.kind).toBe('eat');
  });

  it('prefers somewhere new but still allows a repeat', () => {
    const c = ctx({ hour: 12 });
    const a = ask({ budget: 'evening' });
    const first = offers(a, c, NONE, 0, 1)[0];

    const visited = new Set([first.spot.id]);
    const after = offers(a, c, visited, 0, 1)[0];
    expect(after.spot.id).not.toBe(first.spot.id);

    // Demoted, not banned — a favourite is still a legitimate answer.
    expect(score(first.spot, a, c, visited)).toBeGreaterThanOrEqual(0);
  });
});

describe('"something else" is not a reroll', () => {
  it('walks down the ranking instead of re-rolling the dice', () => {
    // The old model let you reroll the same random draw. This pages through
    // the ordered list, so the second press shows you different places rather
    // than gambling again.
    const a = ask({ budget: 'evening' });
    const c = ctx({ hour: 12 });
    const p0 = offers(a, c, NONE, 0).map((o) => o.spot.id);
    const p1 = offers(a, c, NONE, 1).map((o) => o.spot.id);
    expect(p0).not.toEqual(p1);
    expect(p0.some((id) => p1.includes(id))).toBe(false);
  });

  it('is deterministic for the same ask', () => {
    const a = ask();
    const c = ctx();
    expect(offers(a, c, NONE, 0).map((o) => o.spot.id)).toEqual(
      offers(a, c, NONE, 0).map((o) => o.spot.id)
    );
  });
});

describe('honesty about having nothing', () => {
  it('reports zero rather than inventing a bad fit', () => {
    // 4am, walking distance only, must be somewhere to eat.
    const n = countMatches(
      ask({ travel: 'foot', from: 'Powai', kinds: ['eat'], budget: 'quick' }),
      ctx({ hour: 4 }),
      NONE
    );
    expect(n).toBe(0);
    expect(offers(ask({ travel: 'foot', from: 'Powai', kinds: ['eat'], budget: 'quick' }), ctx({ hour: 4 }), NONE)).toHaveLength(0);
  });
});

describe('the reason on each card', () => {
  it('gives different reasons across a set rather than repeating one', () => {
    const got = offers(ask({ budget: 'evening' }), ctx({ hour: 12 }), NONE);
    const reasons = new Set(got.map((o) => o.because));
    expect(reasons.size).toBeGreaterThan(1);
  });

  it('leads with the rain when it is raining and the place is indoors', () => {
    const indoor = SPOTS.find((s) => !s.outdoor)!;
    expect(reasonFor(indoor, ask(), ctx({ raining: true }), 20)).toMatch(/raining/i);
  });

  it('warns you when somewhere is about to shut', () => {
    const spot = SPOTS.find((s) => s.closes === 20 && s.opens < 20)!;
    expect(reasonFor(spot, ask(), ctx({ hour: 19 }), 20)).toMatch(/Shuts at/);
  });
});

describe('Mumbai specifics', () => {
  it('knows when the monsoon is', () => {
    expect(isMonsoon(7)).toBe(true);
    expect(isMonsoon(1)).toBe(false);
  });

  it('orders neighbourhoods south to north, which is how the city runs', () => {
    expect(AREAS_SOUTH_TO_NORTH[0]).toBe('Colaba');
    expect(AREAS_SOUTH_TO_NORTH[AREAS_SOUTH_TO_NORTH.length - 1]).toBe('Borivali');
  });

  it('every seeded spot is attributed to a person', () => {
    // The credit is the asset. A spot with no contributor is a listings site.
    for (const s of SPOTS) expect(s.addedBy.length).toBeGreaterThan(0);
  });
});
