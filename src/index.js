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
function bind (vm, key, options) {
  if (!Helpers.isObject(options.source)) {
    throw new Error('VueFire: invalid Firebase binding source.')
  }
  var source = options.source
  var BinderKlass = null
  // bind based on initial value type
  if (source.firestore) {
    BinderKlass = source.where ? Binders.QueryBinder : Binders.DocumentBinder
  } else {
    BinderKlass = options.asObject ? Binders.ObjectBinder : Binders.ArrayBinder
  }

  var binder = new BinderKlass(vm, key, source)
  vm.$firebaseBinders[key] = binder
  binder.init()
  return binder.bind()
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
    delete vm.$firebaseBinders[key]
  }
}

/**
 * Ensure the related bookkeeping variables on an instance.
 *
 * @param {Vue} vm
 */
function ensureRefs (vm) {
  if (!vm.$firebaseBinders) {
    Vue.util.defineReactive(vm, '$firebaseBinders', Object.create(null))
  }
}

var init = function () {
  ensureRefs(this)
  function bindAll (vm, bindings) {
    if (typeof bindings === 'function') bindings = bindings.call(this)
    for (var key in bindings) {
      bind(vm, key, bindings[key])
    }
  }
  bindAll(this, this.$options.firebase)
  bindAll(this, this.$options.firestore)
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
  Vue.prototype.$bindAsObject = function (key, source) {
    ensureRefs(this)
    return bind(this, key, {
      source,
      asObject: true,
    })
  }

  Vue.prototype.$bindAsArray = function (key, source) {
    ensureRefs(this)
    return bind(this, key, {
      source,
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
