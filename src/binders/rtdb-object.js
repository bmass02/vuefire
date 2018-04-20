import { BaseBinder } from './base'
import * as Helpers from '../helpers/rtdb'

export class ObjectBinder extends BaseBinder {
  constructor (vm, key, source, onReady, onError) {
    super(...arguments)
    if (typeof this.source.on !== 'function') {
      throw new Error('Not a valid source to bind.')
    }
    this.initialValue = {}
  }

  init () {
    this._init(this.initialValue)
  }

  bind () {
    this.unbind()
    var watcher = this.source.on('value', (snapshot) => {
      this.vm[this.key] = Helpers.createRecord(snapshot)
    }, this.onError)

    this.off = Helpers.callOnceFn(() => {
      this.source.off('value', watcher)
    })
    return this.source.once('value').then(() => {
      this.onReady()
    })
  }
}
