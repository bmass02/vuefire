export function callOnceFn (fn) {
  if (typeof fn !== 'function') throw new Error('Must pass a function.')

  let callOnce = (...params) => {
    fn(...params)
    callOnce = () => {}
  }
  return callOnce
}

export function toPath (source, getIdent) {
  if (!(isFirestoreDoc(source) || isFirebaseRef(source))) {
    throw new Error('Only Firestore DocumentReferences can be converted to a path.')
  }

  const segments = []
  let stepper = source
  while (stepper) {
    segments.unshift(getIdent(stepper))
    stepper = stepper.parent
  }
  return segments.join('/')
}