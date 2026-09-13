import { describe, it, expect } from 'vitest';
import { getRank, getRankTitle, RANK_TIERS } from '../app/lib/ranks';

describe('rank progression', () => {
  it('reports the tier a given XP total falls in', () => {
    expect(getRankTitle(0)).toBe('Fresh Escapee');
    expect(getRankTitle(99)).toBe('Fresh Escapee');
    expect(getRankTitle(100)).toBe('Chaos Local');
    expect(getRankTitle(699)).toBe('Boredom Slayer');
    expect(getRankTitle(1500)).toBe('Mumbai Made');
    expect(getRankTitle(99999)).toBe('Mumbai Made');
  });

  it('measures progress through the current tier, not through all XP', () => {
    // Halfway between Chaos Local (100) and Boredom Slayer (300).
    const rank = getRank(200);
    expect(rank.current.title).toBe('Chaos Local');
    expect(rank.next?.title).toBe('Boredom Slayer');
    expect(rank.progress).toBeCloseTo(0.5);
    expect(rank.xpToNext).toBe(100);
  });

  it('pins the top tier at full progress with nothing left to earn', () => {
    const rank = getRank(2000);
    expect(rank.next).toBeNull();
    expect(rank.progress).toBe(1);
    expect(rank.xpToNext).toBe(0);
  });

  it('treats missing or nonsensical XP as zero rather than going negative', () => {
    for (const value of [undefined, null, NaN, -50]) {
      const rank = getRank(value as number);
      expect(rank.current.title).toBe('Fresh Escapee');
      expect(rank.progress).toBeGreaterThanOrEqual(0);
      expect(rank.xpToNext).toBe(100);
    }
  });

  it('starts every tier exactly where the previous one ends', () => {
    for (let i = 1; i < RANK_TIERS.length; i++) {
      const atThreshold = getRank(RANK_TIERS[i].minXp);
      expect(atThreshold.current.title).toBe(RANK_TIERS[i].title);
      // Landing on a tier means 0% through it — except the top tier, which has
      // nothing above it and so reads as complete.
      const isTopTier = i === RANK_TIERS.length - 1;
      expect(atThreshold.progress).toBe(isTopTier ? 1 : 0);

      const justBelow = getRank(RANK_TIERS[i].minXp - 1);
      expect(justBelow.current.title).toBe(RANK_TIERS[i - 1].title);
      expect(justBelow.xpToNext).toBe(1);
    }
  });
});
