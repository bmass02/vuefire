import { BaseBinder } from './base'
import * as Helpers from '../helpers/firestore'

export class QueryBinder extends BaseBinder {
  constructor (vm, key, source) {
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
    return new Promise((resolve, reject) => {
      var resolveOnce = Helpers.callOnceFn(resolve)

      var off = this.source.onSnapshot((results) => {
        Helpers.getDocChanges(results).forEach((change) => {
          switch (change.type) {
            case 'added': {
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
        resolveOnce(results)
      }, reject)

      this.off = Helpers.callOnceFn(off)
    })
  }
}
