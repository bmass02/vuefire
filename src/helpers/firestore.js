export * from './common'

export function createRecord (snapshot) {
  const record = snapshot.exists ? snapshot.data() : {}
  record['.id'] = snapshot.id
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
