/** 52°04.123' N, the way chart plotters show a coordinate */
export function formatCoordinate(value: number, isLatitude: boolean): string {
  const hemisphere = isLatitude ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E';
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Number(((abs - degrees) * 60).toFixed(3));
  if (minutes >= 60) {
    degrees += 1;
    minutes -= 60;
  }
  const deg = String(degrees).padStart(isLatitude ? 2 : 3, '0');
  return `${deg}°${minutes.toFixed(3).padStart(6, '0')}' ${hemisphere}`;
}
