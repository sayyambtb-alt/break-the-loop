import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedPlaces from '../app/components/SavedPlaces';

const gem = { name: 'A local bookshop', neighborhood: 'Fort', description: 'Browse a shelf you have never explored.' };
beforeEach(() => { localStorage.clear(); });

describe('saved places', () => {
  it('saves a discovered place across visits, builds a Maps search, and removes it', async () => {
    const user = userEvent.setup();
    const first = render(<SavedPlaces userId="explorer-a" activeGem={gem} />);
    await user.click(await screen.findByRole('button', { name: 'Save this place' }));
    expect(screen.getByRole('heading', { name: gem.name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Find on Maps/ })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=A%20local%20bookshop%2C%20Fort%2C%20Mumbai');
    expect(JSON.parse(localStorage.getItem('btl_saved_places_explorer-a')!)[0].city).toBe('Mumbai');
    first.unmount();
    render(<SavedPlaces userId="explorer-a" activeGem={null} />);
    expect(await screen.findByRole('heading', { name: gem.name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: `Remove ${gem.name}` }));
    expect(screen.queryByRole('heading', { name: gem.name })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('btl_saved_places_explorer-a')!)).toEqual([]);
  });

  it('keeps saved places separate when a different account uses the device', async () => {
    localStorage.setItem('btl_saved_places_explorer-a', JSON.stringify([gem]));
    const first = render(<SavedPlaces userId="explorer-a" activeGem={null} />);
    expect(await screen.findByRole('heading', { name: gem.name })).toBeInTheDocument();
    first.unmount();
    render(<SavedPlaces userId="explorer-b" activeGem={null} />);
    await waitFor(() => expect(screen.getByText('A good spot is worth keeping.')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: gem.name })).not.toBeInTheDocument();
  });

  it('reports a storage failure without claiming that a place was saved', async () => {
    const user = userEvent.setup();
    render(<SavedPlaces userId="explorer-a" activeGem={gem} />);
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await user.click(await screen.findByRole('button', { name: 'Save this place' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not save');
    expect(screen.queryByRole('heading', { name: gem.name })).not.toBeInTheDocument();
    storage.mockRestore();
  });

  it('preserves legacy Mumbai places and keeps a same-name place in another city separate', async () => {
    const user = userEvent.setup();
    // Old saves have no city field. A future city must not relocate or replace them.
    localStorage.setItem('btl_saved_places_explorer-a', JSON.stringify([gem]));
    const futureCityGem = { ...gem, city: 'Pune' };
    const view = render(<SavedPlaces userId="explorer-a" activeGem={futureCityGem} />);
    await user.click(await screen.findByRole('button', { name: 'Save this place' }));
    expect(JSON.parse(localStorage.getItem('btl_saved_places_explorer-a')!)).toHaveLength(2);
    view.unmount();

    render(<SavedPlaces userId="explorer-a" activeGem={null} />);
    const links = await screen.findAllByRole('link', { name: /Find on Maps/ });
    const urls = links.map(link => new URL(link.getAttribute('href')!).searchParams.get('query'));
    expect(urls).toContain('A local bookshop, Fort, Mumbai');
    expect(urls).toContain('A local bookshop, Fort, Pune');

    const puneLink = links.find(link => link.getAttribute('href')!.endsWith('Pune'))!;
    await user.click(within(puneLink.closest('li')!).getByRole('button', { name: `Remove ${gem.name}` }));
    expect(screen.getAllByRole('heading', { name: gem.name })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Find on Maps/ }).getAttribute('href')).toContain('Mumbai');
  });
});
