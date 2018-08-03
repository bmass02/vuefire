/*!
 * vuefire v2.0.0-alpha.7
 * (c) 2018 Eduardo San Martin Morote
 * Released under the MIT License.
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var BaseBinder = function BaseBinder (vm, key, source) {
  this.vm = vm;
  this.key = key;
  this.source = source;
  this.initialValue = null;
};

BaseBinder.prototype.bind = function bind () {
  return new Promise(function () {
    throw new Error('[bind] must be implemented in children.')
  })
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

function isFirestoreDoc (source) {
  return 'collection' in source
}

function isFirebaseRef (ref) {
  return ref.hasOwnProperty('key')
}

function toPath (source, getIdent) {
  if (!(isFirestoreDoc(source) || isFirebaseRef(source))) {
    throw new Error('Only Firestore DocumentReferences can be converted to a path.')
  }

  var segments = [];
  var stepper = source;
  while (stepper) {
    segments.unshift(getIdent(stepper));
    stepper = stepper.parent;
  }
  return segments.join('/')
}

function createRecord (snapshot) {
  var record = snapshot.exists ? snapshot.data() : {};
  Object.defineProperty(record, '.id', {
    value: snapshot.id
  });
  record['.path'] = toPath(snapshot.ref, function (doc) { return doc.id; });
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



function getDocChanges (querySnapshot) {
  if (typeof querySnapshot.docChanges === 'function') {
    return querySnapshot.docChanges()
  }

  return querySnapshot.docChanges
}

var DocumentBinder = (function (BaseBinder$$1) {
  function DocumentBinder (vm, key, source) {
    BaseBinder$$1.apply(this, arguments);
    if (!(this.source.firestore && this.source.collection)) {
      throw new Error('Not a valid Firestore DocumentReference to bind.')
    }
  }

  if ( BaseBinder$$1 ) DocumentBinder.__proto__ = BaseBinder$$1;
  DocumentBinder.prototype = Object.create( BaseBinder$$1 && BaseBinder$$1.prototype );
  DocumentBinder.prototype.constructor = DocumentBinder;

  DocumentBinder.prototype.path = function path () {
    return stringifyPath(this.source)
  };

  DocumentBinder.prototype.init = function init () {
    this._init(this.initialValue);
  };

  DocumentBinder.prototype.bind = function bind () {
    var this$1 = this;

    return new Promise(function (resolve, reject) {
      var resolveOnce = callOnceFn(resolve);
      var off = this$1.source.onSnapshot(function (snapshot) {
        this$1.vm[this$1.key] = createRecord(snapshot);
        resolveOnce();
      }, reject);

      this$1.off = callOnceFn(off);
    })
  };

  return DocumentBinder;
}(BaseBinder));

var QueryBinder = (function (BaseBinder$$1) {
  function QueryBinder (vm, key, source) {
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
    this._init(this.initialValue);
  };

  QueryBinder.prototype.add = function add (index, record) {
    this.vm[this.key].splice(index, 0, record);
  };

  QueryBinder.prototype.update = function update (index, record) {
    this.vm[this.key].splice(index, 1, record);
  };

  QueryBinder.prototype.delete = function delete$1 (index) {
    this.vm[this.key].splice(index, 1);
  };

  QueryBinder.prototype.bind = function bind () {
    var this$1 = this;

    this.unbind();
    return new Promise(function (resolve, reject) {
      var resolveOnce = callOnceFn(resolve);

      var off = this$1.source.onSnapshot(function (results) {
        getDocChanges(results).forEach(function (change) {
          switch (change.type) {
            case 'added': {
              this$1.add(change.newIndex, createRecord(change.doc));
              break
            }
            case 'modified': {
              var record = createRecord(change.doc);
              if (change.oldIndex === change.newIndex) {
                this$1.update(change.oldIndex, record);
              } else {
                this$1.delete(change.oldIndex);
                this$1.add(change.newIndex, record);
              }
              break
            }
            case 'removed': {
              this$1.delete(change.oldIndex);
              break
            }
          }
        });
        resolveOnce();
      }, reject);

      this$1.off = callOnceFn(off);
    })
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

function _getRef (refOrQuery) {
  if (typeof refOrQuery.ref === 'function') {
    refOrQuery = refOrQuery.ref();
  } else if (typeof refOrQuery.ref === 'object') {
    refOrQuery = refOrQuery.ref;
  }

  return refOrQuery
}

function createRecord$1 (snapshot) {
  var value = snapshot.val();
  var res = isObject(value)
    ? value
    : { '.value': value };
  res['.key'] = _getKey(snapshot);
  res['.path'] = toPath(_getRef(snapshot, _getKey));
  return res
}

var ArrayBinder = (function (BaseBinder$$1) {
  function ArrayBinder (vm, key, source) {
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

  ArrayBinder.prototype.add = function add (index, record) {
    this.vm[this.key].splice(index, 0, record);
  };

  ArrayBinder.prototype.update = function update (index, record) {
    this.vm[this.key].splice(index, 1, record);
  };

  ArrayBinder.prototype.delete = function delete$1 (index) {
    return this.vm[this.key].splice(index, 1)[0]
  };

  ArrayBinder.prototype.bind = function bind () {
    var this$1 = this;

    this.unbind();
    var onAdd = this.source.on('child_added', function (snapshot, prevKey) {
      var index = prevKey ? indexForKey(this$1.initialValue, prevKey) + 1 : 0;
      this$1.add(index, createRecord$1(snapshot));
    });

    var onRemove = this.source.on('child_removed', function (snapshot) {
      var index = indexForKey(this$1.initialValue, _getKey(snapshot));
      this$1.delete(index);
    });

    var onChange = this.source.on('child_changed', function (snapshot) {
      var index = indexForKey(this$1.initialValue, _getKey(snapshot));
      this$1.update(index, createRecord$1(snapshot));
    });

    var onMove = this.source.on('child_moved', function (snapshot, prevKey) {
      var index = indexForKey(this$1.initialValue, _getKey(snapshot));
      var record = this$1.delete(index);
      var newIndex = prevKey ? indexForKey(this$1.initialValue, prevKey) + 1 : 0;
      this$1.add(newIndex, record);
    });

    this.off = callOnceFn(function () {
      this$1.source.off('child_added', onAdd);
      this$1.source.off('child_removed', onRemove);
      this$1.source.off('child_changed', onChange);
      this$1.source.off('child_moved', onMove);
    });
    return this.source.once('value')
  };

  return ArrayBinder;
}(BaseBinder));

var ObjectBinder = (function (BaseBinder$$1) {
  function ObjectBinder (vm, key, source) {
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
    var this$1 = this;

    this.unbind();
    var watcher = this.source.on('value', function (snapshot) {
      this$1.vm[this$1.key] = createRecord$1(snapshot);
    });

    this.off = callOnceFn(function () {
      this$1.source.off('value', watcher);
    });
    return this.source.once('value')
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
function bind (vm, key, options) {
  if (!isObject(options.source)) {
    throw new Error('VueFire: invalid Firebase binding source.')
  }
  var source = options.source;
  var BinderKlass = null;
  // bind based on initial value type
  if (source.firestore) {
    BinderKlass = source.where ? QueryBinder : DocumentBinder;
  } else {
    BinderKlass = options.asObject ? ObjectBinder : ArrayBinder;
  }

  var binder = new BinderKlass(vm, key, source);
  vm.$firebaseBinders[key] = binder;
  binder.init();
  return binder.bind()
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
    delete vm.$firebaseBinders[key];
  }
}

/**
 * Ensure the related bookkeeping variables on an instance.
 *
 * @param {Vue} vm
 */
function ensureRefs (vm) {
  if (!vm.$firebaseBinders) {
    Vue.util.defineReactive(vm, '$firebaseBinders', Object.create(null));
  }
}

var init = function () {
  ensureRefs(this);
  function bindAll (vm, bindings) {
    if (typeof bindings === 'function') { bindings = bindings.call(this); }
    for (var key in bindings) {
      bind(vm, key, bindings[key]);
    }
  }
  bindAll(this, this.$options.firebase);
  bindAll(this, this.$options.firestore);
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
  Vue.prototype.$bindAsObject = function (key, source) {
    ensureRefs(this);
    return bind(this, key, {
      source: source,
      asObject: true,
    })
  };

  Vue.prototype.$bindAsArray = function (key, source) {
    ensureRefs(this);
    return bind(this, key, {
      source: source,
    })
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

exports['default'] = install;
