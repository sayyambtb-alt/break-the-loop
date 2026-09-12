"use client";
import AppIcon from './AppIcon';
export interface Quest { id: string; quest_text: string; mode: "solo" | "duo" | "squad"; rarity?: "common" | "rare" | "legendary"; xp_reward?: number; }
export interface GemDetails { name: string; neighborhood: string; description: string; }
interface MissionCardProps { quest: Quest; credit?: string | null; gem?: GemDetails | null; accepted?: boolean; onReroll: () => void; onAcceptMission: () => void; }
export default function SuspenseMissionCard({ quest, credit, gem, accepted, onReroll, onAcceptMission }: MissionCardProps) {
  const rarity = quest.rarity ?? 'common';
  const label = rarity === 'legendary' ? '⚡ LEGENDARY QUEST' : rarity === 'rare' ? '💎 RARE QUEST' : 'YOUR NEXT SMALL ADVENTURE';
  return <article className={`mission-ticket rarity-${rarity}`}>
    <div className="ticket-top"><span className="eyebrow">{gem ? 'A LOCAL FIND' : label}</span><span className="xp-chip">+{quest.xp_reward ?? 15} IRL XP</span></div>
    {gem ? <><span className="location-label"><AppIcon name="pin" size={16} />{gem.neighborhood}</span><h3>{gem.name}</h3><p>{gem.description}</p>
      <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${gem.name}, ${gem.neighborhood}, Mumbai`)}`} target="_blank" rel="noopener noreferrer">Find on Maps <AppIcon name="arrow" size={16} /></a></> : <h3>{quest.quest_text}</h3>}
    {credit && <p className="ticket-credit">{gem ? 'Shared' : 'Suggested'} by @{credit}</p>}
    {accepted ? <div className="accepted-note"><AppIcon name="check" /><div><strong>You’re doing this.</strong><p>Head out, enjoy the moment, then add a photo below.</p></div></div> : <div className="ticket-actions">
      <button className="primary-button" onClick={onAcceptMission}>Accept mission <AppIcon name="arrow" /></button>
      <button className="secondary-button" onClick={onReroll}><AppIcon name="refresh" size={17} /><span>{gem ? 'Show me another spot' : 'Reroll Quest'}</span></button>
    </div>}
  </article>;
}
