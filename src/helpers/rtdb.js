export * from './common'

/**
 * Returns the key of a Firebase snapshot across SDK versions.
 *
 * @param {FirebaseSnapshot} snapshot
 * @return {string|null}
 */
export function _getKey (snapshot) {
  return typeof snapshot.key === 'function'
    ? snapshot.key()
    : snapshot.key
}

/**
 * Check if a value is an object.
 *
 * @param {*} val
 * @return {boolean}
 */
export function isObject (val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

export function indexForKey (array, key) {
  for (var i = 0; i < array.length; i++) {
    if (array[i]['.key'] === key) {
      return i
    }
  }
  /* istanbul ignore next */
  return -1
}

export function _getRef (refOrQuery) {
  if (typeof refOrQuery.ref === 'function') {
    refOrQuery = refOrQuery.ref()
  } else if (typeof refOrQuery.ref === 'object') {
    refOrQuery = refOrQuery.ref
  }

  return refOrQuery
}

export function createRecord (snapshot) {
  var value = snapshot.val()
  var res = isObject(value)
    ? value
    : { '.value': value }
  res['.key'] = _getKey(snapshot)
  res['.ref'] = _getRef(snapshot)
  return res
}
