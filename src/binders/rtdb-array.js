import { BaseBinder } from './base'
import * as Helpers from '../helpers/rtdb'

export class ArrayBinder extends BaseBinder {
  constructor (vm, key, source, onReady, onError) {
    super(...arguments)
    if (typeof this.source.on !== 'function') {
      throw new Error('Not a valid source to bind.')
    }
    this.initialValue = []
  }

  init () {
    this._init(this.initialValue)
  }

  bind () {
    this.unbind()
    var onAdd = this.source.on('child_added', (snapshot, prevKey) => {
      var index = prevKey ? Helpers.indexForKey(this.initialValue, prevKey) + 1 : 0
      this.initialValue.splice(index, 0, Helpers.createRecord(snapshot))
    }, this.onError)

    var onRemove = this.source.on('child_removed', (snapshot) => {
      var index = Helpers.indexForKey(this.initialValue, Helpers._getKey(snapshot))
      this.initialValue.splice(index, 1)
    }, this.onError)

    var onChange = this.source.on('child_changed', (snapshot) => {
      var index = Helpers.indexForKey(this.initialValue, Helpers._getKey(snapshot))
      this.initialValue.splice(index, 1, Helpers.createRecord(snapshot))
    }, this.onError)

    var onMove = this.source.on('child_moved', (snapshot, prevKey) => {
      var index = Helpers.indexForKey(this.initialValue, Helpers._getKey(snapshot))
      var record = this.initialValue.splice(index, 1)[0]
      var newIndex = prevKey ? Helpers.indexForKey(this.initialValue, prevKey) + 1 : 0
      this.initialValue.splice(newIndex, 0, record)
    }, this.onError)

    this.off = Helpers.callOnceFn(() => {
      this.source.off('child_added', onAdd)
      this.source.off('child_removed', onRemove)
      this.source.off('child_changed', onChange)
      this.source.off('child_moved', onMove)
    })
    this.source.once('value', this.onReady.bind(this.vm))
  }
}
