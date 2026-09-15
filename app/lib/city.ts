interface City {
  slug: string;
  name: string;
  neighborhoods: readonly string[];
}

// Mumbai is the launch city. Keep this fixed: pre-city saved places belong here.
export const LAUNCH_CITY: City = {
  slug: 'mumbai',
  name: 'Mumbai',
  neighborhoods: [
    'Colaba', 'Fort', 'Marine Drive', 'Girgaum', 'Malabar Hill', 'Worli',
    'Dadar', 'Matunga', 'Mahim', 'Sion', 'Wadala', 'Sewri',
    'Bandra', 'Andheri', 'Juhu', 'Powai', 'Borivali', 'Gorai',
  ],
};

// Only one city is live. The server scopes gems, queues, invites and Feed by
// city. Add approved content and a cities row before enabling another city here.
export const CURRENT_CITY = LAUNCH_CITY;

interface PlaceLocation {
  name: string;
  neighborhood: string;
  city?: string;
}

export function getPlaceCity(place: PlaceLocation): string {
  return place.city?.trim() || LAUNCH_CITY.name;
}

export function getPlaceMapsUrl(place: PlaceLocation): string {
  const query = `${place.name}, ${place.neighborhood}, ${getPlaceCity(place)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
