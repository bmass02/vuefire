import { BaseBinder } from './base'
import * as Helpers from '../helpers/firestore'

export class DocumentBinder extends BaseBinder {
  constructor (vm, key, source, onReady, onError) {
    super(...arguments)
    if (!(this.source.firestore && this.source.collection)) {
      throw new Error('Not a valid Firestore DocumentReference to bind.')
    }
    this.initialValue = {}
  }

  path () {
    return Helpers.stringifyPath(this.source)
  }

  init () {
    this.onReadyOnce = Helpers.callOnceFn(this.onReady)
    this._init(this.initialValue)
  }

  bind () {
    var off = this.source.onSnapshot((snapshot) => {
      this.vm[this.key] = Helpers.createRecord(snapshot)
      this.onReadyOnce()
    }, this.onError)

    this.off = Helpers.callOnceFn(off)
  }
}
