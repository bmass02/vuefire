var BaseBinder = require('./base').BaseBinder
var Helpers = require('../helpers/firestore')

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

  bind () {
    this.unbind()
    var off = this.source.onSnapshot(function (results) {
      results.docChanges.forEach((change) => {
        switch (change.type) {
          case 'added': {
            this.array.splice(change.newIndex, 0, Helpers.createRecord(change.doc))
            break
          }
          case 'modified': {
            const record = Helpers.createRecord(change.doc)
            if (change.oldIndex === change.newIndex) {
              this.array.splice(change.oldIndex, 1, record)
            } else {
              this.array.splice(change.oldIndex, 1)
              this.array.splice(change.newIndex, 0, record)
            }
            break
          }
          case 'removed': {
            this.array.splice(change.oldIndex, 1)
            break
          }
        }
      })
      this.onReadyOnce()
    }, this.onError)

    this.off = Helpers.callOnceFn(off)
  }
}
