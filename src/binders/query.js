import { BaseBinder } from './base'
import * as Helpers from '../helpers/firestore'

export class QueryBinder extends BaseBinder {
  constructor (vm, key, source, onReady, onError) {
    super(...arguments)
    if (!(this.source.firestore && this.source.where)) {
      throw new Error('Not a valid Firestore CollectionReference or Query to bind.')
    }
    this.initialValue = []
  }

  path () {
    return Helpers.stringifyPath(this.source)
  }

  init () {
    this.onReadyOnce = Helpers.callOnceFn(this.onReady)
    this._init(this.initialValue)
  }

  add (index, record) {
    this.vm[this.key].splice(index, 0, record)
  }

  update (index, record) {
    this.vm[this.key].splice(index, 1, record)
  }

  delete (index) {
    this.vm[this.key].splice(index, 1)
  }

  bind () {
    this.unbind()
    var off = this.source.onSnapshot((results) => {
      results.docChanges.forEach((change) => {
        switch (change.type) {
          case 'added': {
            this.initialValue.splice(change.newIndex, 0, Helpers.createRecord(change.doc))
            this.add(change.newIndex, Helpers.createRecord(change.doc))
            break
          }
          case 'modified': {
            const record = Helpers.createRecord(change.doc)
            if (change.oldIndex === change.newIndex) {
              this.update(change.oldIndex, record)
            } else {
              this.delete(change.oldIndex)
              this.add(change.newIndex, record)
            }
            break
          }
          case 'removed': {
            this.delete(change.oldIndex)
            break
          }
        }
      })
      this.onReadyOnce()
    }, this.onError)

    this.off = Helpers.callOnceFn(off)
  }
}
