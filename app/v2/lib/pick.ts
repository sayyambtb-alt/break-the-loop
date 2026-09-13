import { SPOTS, isOpenAt, travelMinutes, type Area, type Kind, type Spot } from './spots';

/**
 * What replaces the dice roll.
 *
 * The old model rolled a rarity (common/rare/legendary) and handed you one dare
 * you could only reroll. That is a slot machine: a variable reward on a lever,
 * which is precisely the mechanism the product claims to be rescuing you from.
 *
 * This instead takes what you actually know at the moment you are deciding —
 * how long you have, whether you will travel, whether it is raining, whether
 * you are alone — and returns a small set of real options that fit. Agency
 * rather than compulsion. The reason people don't go out is rarely a shortage
 * of ideas; it is that the ideas don't fit the evening they're actually in.
 */

export type Budget = 'quick' | 'hour' | 'evening';
export type Travel = 'foot' | 'any';

export const BUDGET_MINUTES: Record<Budget, number> = {
  quick: 30,
  hour: 75,
  evening: 300,
};

export const BUDGET_LABEL: Record<Budget, string> = {
  quick: '20 minutes',
  hour: 'An hour',
  evening: 'The evening',
};

export interface Context {
  /** 0–23 local. */
  hour: number;
  /** 0 = Sunday. */
  day: number;
  /** 1–12. Mumbai's monsoon runs June to September and changes everything. */
  month: number;
  raining: boolean;
}

export interface Ask {
  budget: Budget;
  travel: Travel;
  from: Area;
  withSomeone: boolean;
  kinds: Kind[];
}

export interface Offer {
  spot: Spot;
  travel: number;
  total: number;
  /** Why this one surfaced, in the user's language. */
  because: string;
}

export const isMonsoon = (month: number) => month >= 6 && month <= 9;

export function describeContext(ctx: Context): string {
  const part =
    ctx.hour < 5 ? 'Late' :
    ctx.hour < 12 ? 'Morning' :
    ctx.hour < 17 ? 'Afternoon' :
    ctx.hour < 21 ? 'Evening' : 'Night';
  if (ctx.raining) return `${part}, and it's raining`;
  if (isMonsoon(ctx.month)) return `${part}, monsoon`;
  return part;
}

/**
 * Scores a spot against the moment. Higher is better; -1 means "do not offer".
 * Exported so the reasoning is testable rather than buried in a component.
 */
export function score(spot: Spot, ask: Ask, ctx: Context, visited: Set<string>): number {
  const travel = ask.travel === 'foot' ? (spot.area === ask.from ? 8 : -1) : travelMinutes(spot, ask.from);
  if (travel < 0) return -1;

  const total = travel + spot.minutes;
  if (total > BUDGET_MINUTES[ask.budget]) return -1;

  // Somewhere that is shut is not a suggestion. This alone rules out most of
  // what a random generator would hand you at 2am.
  if (!isOpenAt(spot, ctx.hour)) return -1;

  // Rain kills an outdoor plan. Offering one anyway is how an app teaches you
  // to stop trusting it.
  if ((ctx.raining || isMonsoon(ctx.month)) && spot.outdoor) {
    if (ctx.raining) return -1;
  }

  if (ask.kinds.length && !ask.kinds.includes(spot.kind)) return -1;

  let s = 100;

  // Somewhere new beats somewhere you've already been, but a favourite is
  // still a valid answer, so this is a nudge and not a filter.
  if (visited.has(spot.id)) s -= 45;

  // Leave room. A plan that exactly consumes your budget feels like a rush.
  s += Math.round((BUDGET_MINUTES[ask.budget] - total) / 4);

  // Going with someone changes what is worth doing.
  if (ask.withSomeone && spot.betterWith) s += 18;
  if (!ask.withSomeone && spot.betterWith) s -= 10;

  // Short trips should stay short.
  if (ask.budget === 'quick') s -= travel;

  // Free things when you might not want to spend.
  if (spot.rupees === 0) s += 6;

  return s;
}

const clockLabel = (h: number) => {
  const hour = ((h + 11) % 12) + 1;
  return `${hour}${h < 12 || h === 24 ? 'am' : 'pm'}`;
};

/**
 * Candidate lines for "why this one", most distinguishing first.
 *
 * Returns a list rather than a single string because the label's whole job is
 * to tell three cards apart. Picking each card's reason in isolation reliably
 * produces three identical chips — most good things in this city are free and
 * close, so "costs nothing" and "practically next door" are true of nearly
 * everything. offers() walks these lists and hands each card the best reason
 * no other card has taken.
 */
export function reasonsFor(spot: Spot, ask: Ask, ctx: Context, travel: number): string[] {
  const out: string[] = [];

  if (ctx.raining && !spot.outdoor) out.push('Indoors, and it is raining');

  // Closing time is the most actionable fact you can give someone deciding
  // whether to leave now or later.
  const hoursLeft = spot.closes >= spot.opens ? spot.closes - ctx.hour : 24 - ctx.hour + spot.closes;
  if (hoursLeft > 0 && hoursLeft <= 2) out.push(`Shuts at ${clockLabel(spot.closes)}`);

  if (spot.closes <= 11 && ctx.hour < 11) out.push('Only worth it this early');
  if (spot.opens >= 20) out.push('A late one');
  if (ask.withSomeone && spot.betterWith) out.push('Better with someone');
  if (spot.minutes >= 120) out.push('Make a day of it');
  if (spot.minutes <= 30) out.push('In and out');
  if (travel <= 10) out.push('Practically next door');
  if (ask.travel === 'foot') out.push('In your neighbourhood');
  if (spot.rupees === 0) out.push('Costs nothing');
  out.push(`${travel} minutes away`);
  out.push(`${spot.minutes} minutes there`);

  return out;
}

/** The single best reason, ignoring what the other cards are showing. */
export const reasonFor = (spot: Spot, ask: Ask, ctx: Context, travel: number): string =>
  reasonsFor(spot, ask, ctx, travel)[0];

/**
 * Deterministic given a seed, so "show me others" walks through the ranking
 * instead of re-rolling the same dice. You are being shown the next best
 * options, not gambled at again.
 */
export function offers(
  ask: Ask,
  ctx: Context,
  visited: Set<string>,
  page = 0,
  count = 3
): Offer[] {
  const scored = SPOTS.map((spot) => {
    const s = score(spot, ask, ctx, visited);
    if (s < 0) return null;
    const travel = ask.travel === 'foot' ? 8 : travelMinutes(spot, ask.from);
    return { spot, travel, total: travel + spot.minutes, _s: s };
  }).filter(Boolean) as { spot: Spot; travel: number; total: number; _s: number }[];

  scored.sort((a, b) => b._s - a._s || a.spot.name.localeCompare(b.spot.name));
  if (scored.length === 0) return [];

  const start = (page * count) % scored.length;
  const picked = Array.from({ length: Math.min(count, scored.length) }, (_, i) =>
    scored[(start + i) % scored.length]
  );

  // Assign each card the best reason no other card in this set has claimed.
  const taken = new Set<string>();
  return picked.map(({ spot, travel, total }) => {
    const candidates = reasonsFor(spot, ask, ctx, travel);
    const because = candidates.find((r) => !taken.has(r)) ?? candidates[0];
    taken.add(because);
    return { spot, travel, total, because };
  });
}

/** How many real options exist for this ask — drives the honest empty state. */
export function countMatches(ask: Ask, ctx: Context, visited: Set<string>): number {
  return SPOTS.filter((s) => score(s, ask, ctx, visited) >= 0).length;
}
