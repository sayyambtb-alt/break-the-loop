/**
 * Rank progression.
 *
 * The tiers already existed, but nothing in the UI ever showed how far along a
 * tier you were — you just silently changed title one day. For an app whose
 * whole job is getting you to do one more mission, "35 XP to Chaos Local" is
 * the most motivating sentence it can put on screen, so it is worth making a
 * first-class concept rather than a string buried in the footer.
 */

export interface RankTier {
  minXp: number;
  title: string;
  /** Short line shown when you reach the tier. */
  blurb: string;
}

export const RANK_TIERS: RankTier[] = [
  { minXp: 0, title: "Fresh Escapee", blurb: "You just walked out of the loop." },
  { minXp: 100, title: "Chaos Local", blurb: "The city is starting to recognise you." },
  { minXp: 300, title: "Boredom Slayer", blurb: "Boredom actively avoids you now." },
  { minXp: 700, title: "Street Legend", blurb: "People tell stories about your missions." },
  { minXp: 1500, title: "Mumbai Made", blurb: "The city is yours. Nothing left to prove." },
];

export const getRankTitle = (totalXp: number): string => getRank(totalXp).current.title;

export interface RankState {
  current: RankTier;
  next: RankTier | null;
  /** 0–1 through the current tier. 1 when the top tier is reached. */
  progress: number;
  xpIntoTier: number;
  xpForTier: number;
  xpToNext: number;
}

export function getRank(totalXp: number): RankState {
  const xp = Number.isFinite(totalXp) && totalXp > 0 ? totalXp : 0;

  let index = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xp >= RANK_TIERS[i].minXp) index = i;
  }

  const current = RANK_TIERS[index];
  const next = RANK_TIERS[index + 1] ?? null;

  if (!next) {
    return {
      current,
      next: null,
      progress: 1,
      xpIntoTier: xp - current.minXp,
      xpForTier: 0,
      xpToNext: 0,
    };
  }

  const xpForTier = next.minXp - current.minXp;
  const xpIntoTier = xp - current.minXp;

  return {
    current,
    next,
    progress: Math.min(1, Math.max(0, xpIntoTier / xpForTier)),
    xpIntoTier,
    xpForTier,
    xpToNext: Math.max(0, next.minXp - xp),
  };
}
