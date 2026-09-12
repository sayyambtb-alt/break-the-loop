'use client';
import { useEffect, useState } from 'react';
import type { GemDetails } from './SuspenseMissionCard';
import AppIcon from './AppIcon';

export default function SavedPlaces({ userId, activeGem }: { userId: string | null; activeGem: GemDetails | null }) {
  const [places, setPlaces] = useState<GemDetails[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const key = `btl_saved_places_${userId ?? 'visitor'}`;
  useEffect(() => {
    setPlaces([]);
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(stored)) setPlaces(stored.filter((p): p is GemDetails => p && typeof p.name === 'string' && typeof p.neighborhood === 'string' && typeof p.description === 'string').slice(0, 100));
    } catch { setError('Saved places could not be read on this device.'); }
    setReady(true);
  }, [key]);
  const update = (next: GemDetails[]) => {
    try { localStorage.setItem(key, JSON.stringify(next)); setPlaces(next); setError(''); }
    catch { setError('This browser could not save your places. Please allow site storage and try again.'); }
  };
  const matches = (a: GemDetails, b: GemDetails) => a.name === b.name && a.neighborhood === b.neighborhood;
  const isSaved = activeGem && places.some(p => matches(p, activeGem));
  return <section className="saved-panel" id="saved-places" aria-labelledby="saved-title">
    <div className="section-label"><AppIcon name="bookmark" size={17} /><h3 id="saved-title">Your little black book</h3><span>{places.length}</span></div>
    <p className="support-copy">Places for another day. Saved on this device.</p>
    {activeGem && <button className="save-place-button" disabled={!ready || !userId || (!isSaved && places.length >= 100)} onClick={() => update(isSaved ? places.filter(p => !matches(p, activeGem)) : [activeGem, ...places])}>
      <AppIcon name={isSaved ? 'check' : 'bookmark'} size={18} />{isSaved ? 'Saved · tap to remove' : 'Save this place'}
    </button>}
    {error && <p role="alert" className="storage-error">{error}</p>}
    {!ready ? <p className="support-copy">Loading saved places…</p> : places.length === 0 ? <div className="saved-empty"><AppIcon name="bookmark" size={27} /><p>A good spot is worth keeping.</p><span>Discover a place in Explore, then save it here.</span></div> : <ul className="saved-list">{places.map(place => <li key={`${place.neighborhood}:${place.name}`}>
      <div><span className="eyebrow">{place.neighborhood}</span><h4>{place.name}</h4><p>{place.description}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.neighborhood}, Mumbai`)}`} target="_blank" rel="noopener noreferrer">Find on Maps <AppIcon name="arrow" size={14} /></a></div>
      <button className="icon-button" aria-label={`Remove ${place.name}`} onClick={() => update(places.filter(p => !matches(p, place)))}><AppIcon name="close" size={16} /></button>
    </li>)}</ul>}
  </section>;
}
