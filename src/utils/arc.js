function linspace(start, stop, num, endpoint = true) {
  const div = endpoint ? num - 1 : num
  const step = (stop - start) / div
  return Array.from({ length: num }, (_, i) => start + step * i)
}

// returns 2d array [[x0,y0], [x1,y1]...]
function make_arc(start_deg, stop_deg, segments, factor) {
  const lx = linspace(start_deg, stop_deg, segments, true)
  const xy = lx.map((ele) => [Math.cos(ele) * factor, Math.sin(ele) * factor])
  return xy
}

export default function make_thick_arc(start_deg, stop_deg, segments, inner_rad, outer_rad) {
  const inner = make_arc(start_deg, stop_deg, segments, inner_rad / 2)
  const outer = make_arc(start_deg, stop_deg, segments, outer_rad / 2)
  const verts = inner.concat(outer.reverse())
  return verts
}
