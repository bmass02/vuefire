import { BaseBinder } from './base'
import * as Helpers from '../helpers/firestore'

export class DocumentBinder extends BaseBinder {
  constructor (vm, key, source, onReady, onError) {
    super(...arguments)
    if (!(this.source.firestore && this.source.collection)) {
      throw new Error('Not a valid Firestore DocumentReference to bind.')
    }
  }

  path () {
    return Helpers.stringifyPath(this.source)
  }

  init () {
    this._init(this.initialValue)
  }

  bind () {
    return new Promise((resolve, reject) => {
      var onReadyOnce = Helpers.callOnceFn(() => {
        this.onReady()
        resolve()
      })
      var off = this.source.onSnapshot((snapshot) => {
        this.vm[this.key] = Helpers.createRecord(snapshot)
        onReadyOnce()
      }, (err) => {
        this.onError(err)
        reject(err)
      })

      this.off = Helpers.callOnceFn(off)
    })
  }
}
