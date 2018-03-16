/*!
 * vuefire v2.0.0-alpha.7
 * (c) 2018 Eduardo San Martin Morote
 * Released under the MIT License.
 */
var BaseBinder = function BaseBinder (vm, key, source, onReady, onError) {
  this.vm = vm;
  this.key = key;
  this.source = source;
  this.onReady = onReady;
  this.onError = onError;
  this.initialValue = null;
};

BaseBinder.prototype.bind = function bind () {
  throw new Error('[bind] must be implemented in children.')
};

BaseBinder.prototype._init = function _init (value) {
  this.defineReactive(this.vm, this.key, value);
};

BaseBinder.prototype.unbind = function unbind () {
  if (this.off) {
    this.off();
  }
  this.vm[this.key] = this.initialValue;
};

function callOnceFn (fn) {
  if (typeof fn !== 'function') { throw new Error('Must pass a function.') }

  var callOnce = function () {
    var params = [], len = arguments.length;
    while ( len-- ) params[ len ] = arguments[ len ];

    fn.apply(void 0, params);
    callOnce = function () {};
  };
  return callOnce
}

function createRecord (snapshot) {
  var record = snapshot.exists ? snapshot.data() : {};
  record['.id'] = snapshot.id;
  return record
}

function stringifyPath (ref) {
  var segments = [];
  while (ref) {
    segments.unshift(ref.id);
    ref = ref.parent;
  }
  var dbSettings = ref.firestore._databaseId;
  segments.unshift(dbSettings.database);
  segments.unshift(dbSettings.projectId);
  return ref.firebase.segments.join('/')
}

var DocumentBinder = (function (BaseBinder$$1) {
  function DocumentBinder (vm, key, source, onReady, onError) {
    BaseBinder$$1.apply(this, arguments);
    if (!(this.source.firestore && this.source.collection)) {
      throw new Error('Not a valid Firestore DocumentReference to bind.')
    }
    this.initialValue = {};
  }

  if ( BaseBinder$$1 ) DocumentBinder.__proto__ = BaseBinder$$1;
  DocumentBinder.prototype = Object.create( BaseBinder$$1 && BaseBinder$$1.prototype );
  DocumentBinder.prototype.constructor = DocumentBinder;

  DocumentBinder.prototype.path = function path () {
    return stringifyPath(this.source)
  };

  DocumentBinder.prototype.init = function init () {
    this.onReadyOnce = callOnceFn(this.onReady);
    this._init(this.initialValue);
  };

  DocumentBinder.prototype.bind = function bind () {
    var off = this.source.onSnapshot(function (snapshot) {
      this.vm[this.key] = createRecord(snapshot);
      this.onReadyOnce();
    }, this.onError);

    this.off = callOnceFn(off);
  };

  return DocumentBinder;
}(BaseBinder));

var QueryBinder = (function (BaseBinder$$1) {
  function QueryBinder (vm, key, source, onReady, onError) {
    BaseBinder$$1.apply(this, arguments);
    if (!(this.source.firestore && this.source.where)) {
      throw new Error('Not a valid Firestore CollectionReference or Query to bind.')
    }
    this.initialValue = [];
  }

  if ( BaseBinder$$1 ) QueryBinder.__proto__ = BaseBinder$$1;
  QueryBinder.prototype = Object.create( BaseBinder$$1 && BaseBinder$$1.prototype );
  QueryBinder.prototype.constructor = QueryBinder;

  QueryBinder.prototype.path = function path () {
    return stringifyPath(this.source)
  };

  QueryBinder.prototype.init = function init () {
    this.onReadyOnce = callOnceFn(this.onReady);
    this._init(this.initialValue);
  };

  QueryBinder.prototype.bind = function bind () {
    this.unbind();
    var off = this.source.onSnapshot(function (results) {
      var this$1 = this;

      results.docChanges.forEach(function (change) {
        switch (change.type) {
          case 'added': {
            this$1.array.splice(change.newIndex, 0, createRecord(change.doc));
            break
          }
          case 'modified': {
            var record = createRecord(change.doc);
            if (change.oldIndex === change.newIndex) {
              this$1.array.splice(change.oldIndex, 1, record);
            } else {
              this$1.array.splice(change.oldIndex, 1);
              this$1.array.splice(change.newIndex, 0, record);
            }
            break
          }
          case 'removed': {
            this$1.array.splice(change.oldIndex, 1);
            break
          }
        }
      });
      this.onReadyOnce();
    }, this.onError);

    this.off = callOnceFn(off);
  };

  return QueryBinder;
}(BaseBinder));

/**
 * Returns the key of a Firebase snapshot across SDK versions.
 *
 * @param {FirebaseSnapshot} snapshot
 * @return {string|null}
 */
function _getKey (snapshot) {
  return typeof snapshot.key === 'function'
    ? snapshot.key()
    : snapshot.key
}

/**
 * Check if a value is an object.
 *
 * @param {*} val
 * @return {boolean}
 */
function isObject (val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

function indexForKey (array, key) {
  for (var i = 0; i < array.length; i++) {
    if (array[i]['.key'] === key) {
      return i
    }
  }
  /* istanbul ignore next */
  return -1
}



function createRecord$1 (snapshot) {
  var value = snapshot.val();
  var res = isObject(value)
    ? value
    : { '.value': value };
  res['.key'] = _getKey(snapshot);
  return res
}

var ArrayBinder = (function (BaseBinder$$1) {
  function ArrayBinder (vm, key, source, onReady, onError) {
    BaseBinder$$1.apply(this, arguments);
    if (typeof this.source.on !== 'function') {
      throw new Error('Not a valid source to bind.')
    }
    this.initialValue = [];
  }

  if ( BaseBinder$$1 ) ArrayBinder.__proto__ = BaseBinder$$1;
  ArrayBinder.prototype = Object.create( BaseBinder$$1 && BaseBinder$$1.prototype );
  ArrayBinder.prototype.constructor = ArrayBinder;

  ArrayBinder.prototype.init = function init () {
    this._init(this.initialValue);
  };

  ArrayBinder.prototype.bind = function bind () {
    this.unbind();
    var onAdd = this.source.on('child_added', function (snapshot, prevKey) {
      var index = prevKey ? indexForKey(this.initialValue, prevKey) + 1 : 0;
      this.initialValue.splice(index, 0, createRecord$1(snapshot));
    }, this.onError);

    var onRemove = this.source.on('child_removed', function (snapshot) {
      var index = indexForKey(this.initialValue, _getKey(snapshot));
      this.initialValue.splice(index, 1);
    }, this.onError);

    var onChange = this.source.on('child_changed', function (snapshot) {
      var index = indexForKey(this.initialValue, _getKey(snapshot));
      this.initialValue.splice(index, 1, createRecord$1(snapshot));
    }, this.onError);

    var onMove = this.source.on('child_moved', function (snapshot, prevKey) {
      var index = indexForKey(this.initialValue, _getKey(snapshot));
      var record = this.initialValue.splice(index, 1)[0];
      var newIndex = prevKey ? indexForKey(this.initialValue, prevKey) + 1 : 0;
      this.initialValue.splice(newIndex, 0, record);
    }, this.onError);

    this.off = callOnceFn(function () {
      this.source.off('child_added', onAdd);
      this.source.off('child_removed', onRemove);
      this.source.off('child_changed', onChange);
      this.source.off('child_moved', onMove);
    });
    this.source.once('value', this.onReady.bind(this.vm));
  };

  return ArrayBinder;
}(BaseBinder));

var ObjectBinder = (function (BaseBinder$$1) {
  function ObjectBinder (vm, key, source, onReady, onError) {
    BaseBinder$$1.apply(this, arguments);
    if (typeof this.source.on !== 'function') {
      throw new Error('Not a valid source to bind.')
    }
    this.initialValue = {};
  }

  if ( BaseBinder$$1 ) ObjectBinder.__proto__ = BaseBinder$$1;
  ObjectBinder.prototype = Object.create( BaseBinder$$1 && BaseBinder$$1.prototype );
  ObjectBinder.prototype.constructor = ObjectBinder;

  ObjectBinder.prototype.init = function init () {
    this._init(this.initialValue);
  };

  ObjectBinder.prototype.bind = function bind () {
    this.unbind();
    var watcher = this.source.on('value', function (snapshot) {
      this.vm[this.key] = createRecord$1(snapshot);
    }, this.onError);
    this.source.once('value', this.onReady);

    this.off = callOnceFn(function () {
      this.source.off('value', watcher);
    });
  };

  return ObjectBinder;
}(BaseBinder));

var Vue; // late binding

BaseBinder.prototype.defineReactive = function (vm, key, val) {
  if (key in vm) {
    vm[key] = val;
  } else {
    Vue.util.defineReactive(vm, key, val);
  }
};

/**
 * Bind a firebase data source to a key on a vm.
 *
 * @param {Vue} vm
 * @param {string} key
 * @param {object} source
 */
function bind (vm, key, source) {
  var asObject = false;
  var cancelCallback = null;
  var readyCallback = null;
  // check { source, asArray, cancelCallback } syntax
  if (isObject(source) && source.hasOwnProperty('source')) {
    asObject = source.asObject;
    cancelCallback = source.cancelCallback;
    readyCallback = source.readyCallback;
    source = source.source;
  }
  if (!isObject(source)) {
    throw new Error('VueFire: invalid Firebase binding source.')
  }
  cancelCallback = cancelCallback || (function () {});
  readyCallback = readyCallback || (function () {});
  var BinderKlass = null;
  // bind based on initial value type
  if (asObject) {
    BinderKlass = source.firestore ? DocumentBinder : ObjectBinder;
  } else {
    BinderKlass = source.firestore ? QueryBinder : ArrayBinder;
  }

  var binder = new BinderKlass(vm, key, source, readyCallback.bind(vm), cancelCallback.bind(vm));
  binder.init();
  binder.bind();
  vm.$firebaseBinders[key];
}

/**
 * Unbind a firebase-bound key from a vm.
 *
 * @param {Vue} vm
 * @param {string} key
 */
function unbind (vm, key) {
  var binder = vm.$firebaseBinders[key];
  if (binder) {
    binder.unbind();
  }
}

/**
 * Ensure the related bookkeeping variables on an instance.
 *
 * @param {Vue} vm
 */
function ensureRefs (vm) {
  if (!vm.$firebaseBinders) {
    vm.$firebaseBinders = Object.create(null);
  }
}

var init = function () {
  var this$1 = this;

  var bindings = this.$options.firebase;
  if (typeof bindings === 'function') { bindings = bindings.call(this); }
  if (!bindings) { return }
  ensureRefs(this);
  for (var key in bindings) {
    bind(this$1, key, bindings[key]);
  }
};

var VueFireMixin = {
  created: init, // 1.x and 2.x
  beforeDestroy: function () {
    var this$1 = this;

    if (!this.$firebaseBinders) { return }
    for (var key in this$1.$firebaseBinders) {
      if (this$1.$firebaseBinders[key]) {
        this$1.$unbind(key);
      }
    }
    this.$firebaseBinders = null;
  }
};

/**
 * Install function passed to Vue.use() in manual installation.
 *
 * @param {function} _Vue
 */
function install (_Vue) {
  Vue = _Vue;
  Vue.mixin(VueFireMixin);

  var mergeStrats = Vue.config.optionMergeStrategies;
  mergeStrats.firebase = mergeStrats.provide;

  // extend instance methods
  Vue.prototype.$bindAsObject = function (key, source, cancelCallback, readyCallback) {
    ensureRefs(this);
    bind(this, key, {
      source: source,
      asObject: true,
      cancelCallback: cancelCallback,
      readyCallback: readyCallback
    });
  };

  Vue.prototype.$bindAsArray = function (key, source, cancelCallback, readyCallback) {
    ensureRefs(this);
    bind(this, key, {
      source: source,
      cancelCallback: cancelCallback,
      readyCallback: readyCallback
    });
  };

  Vue.prototype.$unbind = function (key) {
    unbind(this, key);
  };
}

// auto install
/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue);
}

export default install;
