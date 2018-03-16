import * as Binders from './binders/index.js'
import * as Helpers from './helpers/rtdb.js'
var Vue // late binding

Binders.BaseBinder.prototype.defineReactive = function (vm, key, val) {
  if (key in vm) {
    vm[key] = val
  } else {
    Vue.util.defineReactive(vm, key, val)
  }
}

/**
 * Bind a firebase data source to a key on a vm.
 *
 * @param {Vue} vm
 * @param {string} key
 * @param {object} source
 */
function bind (vm, key, source) {
  var asObject = false
  var cancelCallback = null
  var readyCallback = null
  // check { source, asArray, cancelCallback } syntax
  if (Helpers.isObject(source) && source.hasOwnProperty('source')) {
    asObject = source.asObject
    cancelCallback = source.cancelCallback
    readyCallback = source.readyCallback
    source = source.source
  }
  if (!Helpers.isObject(source)) {
    throw new Error('VueFire: invalid Firebase binding source.')
  }
  cancelCallback = cancelCallback || (() => {})
  readyCallback = readyCallback || (() => {})
  var BinderKlass = null
  // bind based on initial value type
  if (asObject) {
    BinderKlass = source.firestore ? Binders.DocumentBinder : Binders.ObjectBinder
  } else {
    BinderKlass = source.firestore ? Binders.QueryBinder : Binders.ArrayBinder
  }

  var binder = new BinderKlass(vm, key, source, readyCallback.bind(vm), cancelCallback.bind(vm))
  binder.init()
  binder.bind()
  vm.$firebaseBinders[key]
}

/**
 * Unbind a firebase-bound key from a vm.
 *
 * @param {Vue} vm
 * @param {string} key
 */
function unbind (vm, key) {
  var binder = vm.$firebaseBinders[key]
  if (binder) {
    binder.unbind()
  }
}

/**
 * Ensure the related bookkeeping variables on an instance.
 *
 * @param {Vue} vm
 */
function ensureRefs (vm) {
  if (!vm.$firebaseBinders) {
    vm.$firebaseBinders = Object.create(null)
  }
}

var init = function () {
  var bindings = this.$options.firebase
  if (typeof bindings === 'function') bindings = bindings.call(this)
  if (!bindings) return
  ensureRefs(this)
  for (var key in bindings) {
    bind(this, key, bindings[key])
  }
}

var VueFireMixin = {
  created: init, // 1.x and 2.x
  beforeDestroy: function () {
    if (!this.$firebaseBinders) return
    for (var key in this.$firebaseBinders) {
      if (this.$firebaseBinders[key]) {
        this.$unbind(key)
      }
    }
    this.$firebaseBinders = null
  }
}

/**
 * Install function passed to Vue.use() in manual installation.
 *
 * @param {function} _Vue
 */
function install (_Vue) {
  Vue = _Vue
  Vue.mixin(VueFireMixin)

  var mergeStrats = Vue.config.optionMergeStrategies
  mergeStrats.firebase = mergeStrats.provide

  // extend instance methods
  Vue.prototype.$bindAsObject = function (key, source, cancelCallback, readyCallback) {
    ensureRefs(this)
    bind(this, key, {
      source: source,
      asObject: true,
      cancelCallback: cancelCallback,
      readyCallback: readyCallback
    })
  }

  Vue.prototype.$bindAsArray = function (key, source, cancelCallback, readyCallback) {
    ensureRefs(this)
    bind(this, key, {
      source: source,
      cancelCallback: cancelCallback,
      readyCallback: readyCallback
    })
  }

  Vue.prototype.$unbind = function (key) {
    unbind(this, key)
  }
}

// auto install
/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export default install
