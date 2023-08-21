// quasi-enums via https://stackoverflow.com/a/5040502/2690232
// avoid 0 as a value for safety concerns (e.g. `0 == ''`)
export function Enum(keys) {
  let obj = new Object()
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = i + 1
  }
  Object.freeze(obj)
  return obj
}
