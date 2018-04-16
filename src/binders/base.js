export class BaseBinder {
  constructor (vm, key, source, onReady, onError) {
    this.vm = vm
    this.key = key
    this.source = source
    this.onReady = onReady
    this.onError = onError
    this.initialValue = null
  }

  bind () {
    throw new Error('[bind] must be implemented in children.')
  }

  _init (value) {
    if (this.key in this.vm) {
      this.vm[this.key] = value
    } else {
      Vue.util.defineReactive(this.vm, this.key, value)
    }
  }

  unbind () {
    if (this.off) {
      this.off()
    }
    this.vm[this.key] = this.initialValue
  }
}
