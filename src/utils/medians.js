// https://www.w3resource.com/javascript-exercises/fundamental/javascript-fundamental-exercise-88.php
export function median(arr) {
  const mid = Math.floor(arr.length / 2)
  const nums = [...arr].sort((a, b) => a - b)
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

// https://en.wikipedia.org/wiki/Median_absolute_deviation
export function mad(arr) {
  const med = median(arr)
  // 1.4826 ensures consistency??
  return (
    1.4826 *
    median(
      arr.map((e) => {
        return Math.abs(e - med)
      })
    )
  )
}
