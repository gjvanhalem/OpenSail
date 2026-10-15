/**
 * Track colours (R9.3): each track is drawn in its own colour, picked by the
 * user or, until then, from a palette by the track's id so it stays the same.
 */

export const TRACK_COLORS = [
  { value: '#2563eb', name: 'Blue' },
  { value: '#dc2626', name: 'Red' },
  { value: '#16a34a', name: 'Green' },
  { value: '#ea580c', name: 'Orange' },
  { value: '#9333ea', name: 'Purple' },
  { value: '#0891b2', name: 'Cyan' },
  { value: '#db2777', name: 'Pink' },
  { value: '#854d0e', name: 'Brown' },
] as const;

/** The colour a track is drawn in */
export function trackColor(track: { id?: string; color?: string }): string {
  if (track.color) return track.color;
  const id = track.id ?? '';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return TRACK_COLORS[hash % TRACK_COLORS.length].value;
}
