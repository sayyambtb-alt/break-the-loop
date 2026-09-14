'use client';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import type { GemDetails } from './SuspenseMissionCard';
import AppIcon from './AppIcon';
import { getPlaceCity, getPlaceMapsUrl } from '../lib/city';

const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener('btl:saved-places', notify);
  return () => { window.removeEventListener('storage', notify); window.removeEventListener('btl:saved-places', notify); };
};
const serverSnapshot = () => null;

export default function SavedPlaces({ userId, activeGem }: { userId: string | null; activeGem: GemDetails | null }) {
  const [writeError, setWriteError] = useState('');
  const key = `btl_saved_places_${userId ?? 'visitor'}`;
  const getSnapshot = useCallback(() => {
    try { return localStorage.getItem(key) || '[]'; }
    catch { return 'storage-unavailable'; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const ready = raw !== null;
  const { places, readError } = useMemo(() => {
    try {
      const stored: unknown = JSON.parse(raw || '[]');
      if (!Array.isArray(stored)) throw new Error('Invalid saved places');
      return { places: stored.filter((p): p is GemDetails => p && typeof p.name === 'string' && typeof p.neighborhood === 'string' && typeof p.description === 'string' && (p.city === undefined || typeof p.city === 'string')).slice(0, 100), readError: '' };
    } catch { return { places: [], readError: 'Saved places could not be read on this device.' }; }
  }, [raw]);
  const error = writeError || readError;
  const update = (next: GemDetails[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event('btl:saved-places'));
      setWriteError('');
    } catch { setWriteError('This browser could not save your places. Please allow site storage and try again.'); }
  };
  const matches = (a: GemDetails, b: GemDetails) => a.name === b.name && a.neighborhood === b.neighborhood && getPlaceCity(a) === getPlaceCity(b);
  const isSaved = activeGem && places.some(p => matches(p, activeGem));
  return <section className="saved-panel" id="saved-places" aria-labelledby="saved-title">
    <div className="section-label"><AppIcon name="bookmark" size={17} /><h3 id="saved-title">Your little black book</h3><span>{places.length}</span></div>
    <p className="support-copy">Places for another day. Saved on this device.</p>
    {activeGem && <button className="save-place-button" disabled={!ready || !userId || (!isSaved && places.length >= 100)} onClick={() => update(isSaved ? places.filter(p => !matches(p, activeGem)) : [{ ...activeGem, city: getPlaceCity(activeGem) }, ...places])}>
      <AppIcon name={isSaved ? 'check' : 'bookmark'} size={18} />{isSaved ? 'Saved · tap to remove' : 'Save this place'}
    </button>}
    {error && <p role="alert" className="storage-error">{error}</p>}
    {!ready ? <p className="support-copy">Loading saved places…</p> : places.length === 0 ? <div className="saved-empty"><AppIcon name="bookmark" size={27} /><p>A good spot is worth keeping.</p><span>Discover a place in Explore, then save it here.</span></div> : <ul className="saved-list">{places.map(place => <li key={`${getPlaceCity(place)}:${place.neighborhood}:${place.name}`}>
      <div><span className="eyebrow">{place.neighborhood} · {getPlaceCity(place)}</span><h4>{place.name}</h4><p>{place.description}</p><a href={getPlaceMapsUrl(place)} target="_blank" rel="noopener noreferrer">Find on Maps <AppIcon name="arrow" size={14} /></a></div>
      <button className="icon-button" aria-label={`Remove ${place.name}`} onClick={() => update(places.filter(p => !matches(p, place)))}><AppIcon name="close" size={16} /></button>
    </li>)}</ul>}
  </section>;
}
