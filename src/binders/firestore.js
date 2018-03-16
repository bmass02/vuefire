import { BaseBinder } from './base'
import * as Helpers from '../helpers/firestore'

class SnapshotWrapper {

}

export class FirestoreBinder extends BaseBinder {
  constructor (vm, key, source, onReady, onError, maxDepth) {
    super(...arguments)
    if (!this.source.firestore) {
      throw new Error('Not a valid Firestore Source to bind.')
    }
    this.maxDepth = maxDepth
    this.deps = {}
  }

  path () {
    return Helpers.stringifyPath(this.source)
  }

  _isSubRef () {
    return this.key.split('.').length > 1
  }

  init () {
    this.onReadyOnce = Helpers.callOnceFn(this.onReady)
    if (this._isSubRef()) {
      this._setData(this.initialValue)
    } else {
      this._init(this.initialValue)
    }
  }

  _bindSubRefs (data, deps) {
    if (this.maxDepth === 0) return
    for (var key in data) {
      const val = data[key]
      if (val.firestore) {
        const BindingKlass = val.collection ? DocumentBinder : QueryBinder
        const binder = new BindingKlass(this.vm, this.key + '.' + key, val, this.onReady, this.onError, this.maxDepth - 1)
        if (!deps[key] || deps[key].path() !== binder.path()) {
          deps[key] = binder
          binder.init()
          binder.bind()
        }
      }
    }
  }

  _setData (data) {
    var segments = this.key.split('.')
    var key = segments.pop()
    var objToBeSet = this.vm
    segments.forEach((seg) => {
      objToBeSet = objToBeSet[seg]
    })
    this.vm.$set(objToBeSet, key, data)
  }

  _unbindDeps (deps) {
    for (var key in deps) {
      var binder = deps[key]
      binder.unbind()
      delete deps[key]
    }
  }

  unbind () {
    if (this.off) {
      this.off()
    }
    this._unbindDeps(this.deps)
  }
}

export class DocumentBinder extends FirestoreBinder {
  constructor (vm, key, source, onReady, onError, maxDepth) {
    super(...arguments)
    if (!(this.source.firestore && this.source.collection)) {
      throw new Error('Not a valid Firestore DocumentReference to bind.')
    }
    this.initialValue = {}
  }

  bind () {
    var off = this.source.onSnapshot(function (snapshot) {
      var record = Helpers.createRecord(snapshot)
      this._setData(record)
      this._bindSubRefs(record, this.deps)
      this.onReadyOnce()
    }, this.onError)

    this.off = Helpers.callOnceFn(off)
  }
}

export class QueryBinder extends FirestoreBinder {
  constructor (vm, key, source, onReady, onError) {
    super(...arguments)
    if (!(this.source.firestore && this.source.where)) {
      throw new Error('Not a valid Firestore CollectionReference or Query to bind.')
    }
    this.initialValue = []
  }

  bind () {
    this.unbind()
    var off = this.source.onSnapshot(function (results) {
      results.docChanges.forEach((change) => {
        const record = Helpers.createRecord(change.doc)
        switch (change.type) {
          case 'added': {
            this.initialValue.splice(change.newIndex, 0, Helpers.createRecord(change.doc))
            this.deps.splice(change.newIndex, 0, {})
            break
          }
          case 'modified': {
            if (change.oldIndex === change.newIndex) {
              this.initialValue.splice(change.oldIndex, 1, record)
            } else {
              this.initialValue.splice(change.oldIndex, 1)
              this.initialValue.splice(change.newIndex, 0, record)
              this.deps.splice(change.newIndex, 0, this.deps.splice(change.oldIndex, 1)[0])
            }
            break
          }
          case 'removed': {
            this._unbindDeps(this.deps[change.oldIndex])
            this.deps.splice(change.oldIndex, 1)
            this.initialValue.splice(change.oldIndex, 1)
            break
          }
        }
      })
      this.onReadyOnce()
    }, this.onError)

    this.off = Helpers.callOnceFn(off)
  }
}
