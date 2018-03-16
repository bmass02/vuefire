export function callOnceFn (fn) {
  if (typeof fn !== 'function') throw new Error('Must pass a function.')

  let callOnce = (...params) => {
    fn(...params)
    callOnce = () => {}
  }
  return callOnce
}
