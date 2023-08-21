// signed distance between angles in degrees
// modified from https://stackoverflow.com/a/30887154/2690232
// from a to b, + is CCW and - is CW
export default function signedAngleDeg(a, b) {
  let d = Math.abs(a - b) % 360
  let r = d > 180 ? 360 - d : d
  let sign = a - b >= 0 && a - b <= 180 || a - b <= -180 && a - b >= -360 ? -1 : 1
  return r * sign
}
