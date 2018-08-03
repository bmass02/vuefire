import * as common from './common'
export * from './common'

export function createRecord (snapshot) {
  const record = snapshot.exists ? snapshot.data() : {}
  Object.defineProperty(record, '.id', {
    value: snapshot.id
  })
  record['.path'] = common.toPath(snapshot.ref, (doc) => doc.id)
  return record
}

export function stringifyPath (ref) {
  var segments = []
  while (ref) {
    segments.unshift(ref.id)
    ref = ref.parent
  }
  var dbSettings = ref.firestore._databaseId
  segments.unshift(dbSettings.database)
  segments.unshift(dbSettings.projectId)
  return ref.firebase.segments.join('/')
}

export function areEqual (ref1, ref2) {
  return stringifyPath(ref1) === stringifyPath(ref2)
}

export function getDocChanges (querySnapshot) {
  if (typeof querySnapshot.docChanges === 'function') {
    return querySnapshot.docChanges()
  }

  return querySnapshot.docChanges
}