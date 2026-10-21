/**
 * Day or night at a place and time, for the automatic display mode. Uses the
 * sun's elevation (NOAA's simplified solar position, good to well under a
 * degree), so it works at any latitude and season without a sunrise table.
 */

const RAD = Math.PI / 180;

/** The sun's elevation above the horizon, degrees */
export function sunElevation(date: Date, latitude: number, longitude: number): number {
  // Days since J2000.0
  const d = date.getTime() / 86_400_000 - 10_957.5;
  const meanLongitude = (280.46 + 0.9856474 * d) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * d) % 360) * RAD;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;
  const obliquity = (23.439 - 0.0000004 * d) * RAD;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude)
  );

  // Greenwich mean sidereal time, then the local hour angle
  const gmst = (280.46061837 + 360.98564736629 * d) % 360;
  const hourAngle = (gmst + longitude) * RAD - rightAscension;

  const lat = latitude * RAD;
  const sinElevation =
    Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(sinElevation) / RAD;
}

/**
 * Whether it is dark enough for night mode: the sun more than 6° below the
 * horizon (civil twilight over). Without a position, 20:00 to 07:00 local time.
 */
export function isNight(date: Date, position: { latitude: number; longitude: number } | null): boolean {
  if (!position) {
    const hour = date.getHours();
    return hour >= 20 || hour < 7;
  }
  return sunElevation(date, position.latitude, position.longitude) < -6;
}
