import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
