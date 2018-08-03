export class BaseBinder {
  constructor (vm, key, source) {
    this.vm = vm
    this.key = key
    this.source = source
    this.initialValue = null
  }

  bind () {
    return new Promise(() => {
      throw new Error('[bind] must be implemented in children.')
    })
  }

  _init (value) {
    this.defineReactive(this.vm, this.key, value)
  }

  unbind () {
    if (this.off) {
      this.off()
    }
    this.vm[this.key] = this.initialValue
  }
}
