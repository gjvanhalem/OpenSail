import type { Track } from '@/database/db';
import type { TrackPoint } from '@/database/db';

/**
 * Export a track to GPX format
 */
export function exportTrackToGPX(track: Track): string {
  const points = JSON.parse(track.points.data) as TrackPoint[];

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSail Navigation" 
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(track.name)}</name>
    <time>${new Date(track.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(track.name)}</name>
    <type>Track</type>
    <trkseg>
${points.map((point) => generateTrackPoint(point)).join('\n')}
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Generate GPX track point XML
 */
function generateTrackPoint(point: TrackPoint): string {
  const timestamp = new Date(point.timestamp).toISOString();
  
  return `      <trkpt lat="${point.latitude}" lon="${point.longitude}">
        <time>${timestamp}</time>
        <extensions>
          <speed>${point.speed}</speed>
          <course>${point.heading}</course>
        </extensions>
      </trkpt>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Download GPX file
 */
export function downloadGPX(track: Track): void {
  const gpxContent = exportTrackToGPX(track);
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(track.name)}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Sanitize filename for download
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}
