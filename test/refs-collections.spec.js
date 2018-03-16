import Vuefire from '../src'
import {
  db,
  tick,
  delay,
  delayUpdate,
  spyUnbind,
  Vue
} from './helpers'

Vue.use(Vuefire)

let vm, collection, a, b, first
beforeEach(async () => {
  a = db.collection().doc()
  b = db.collection().doc()
  await a.update({ isA: true })
  await b.update({ isB: true })
  collection = db.collection()
  first = await collection.add({ ref: a })
  await collection.add({ ref: b })

  vm = new Vue({
    data: () => ({
      items: null
    })
  })
  await tick()
})

test('binds refs on collections', async () => {
  await vm.$bindAsArray('items', collection)

  expect(vm.items).toEqual([
    { ref: { isA: true }},
    { ref: { isB: true }}
  ])
})

test('waits for array to be fully populated', async () => {
  const c = db.collection().doc()
  await c.update({ isC: true })
  await collection.add({ ref: c })
  // force callback delay
  delayUpdate(c)
  const data = await vm.$bindAsArray('items', collection)

  expect(data).toEqual(vm.items)
  expect(vm.items).toEqual([
    { ref: { isA: true }},
    { ref: { isB: true }},
    { ref: { isC: true }}
  ])
})

test('binds refs when adding to collection', async () => {
  await vm.$bindAsArray('items', collection)
  const c = db.collection().doc()
  await c.update({ isC: true })

  await collection.add({ ref: c })
  // NOTE wait for refs to update
  await delay(5)

  expect(vm.items).toEqual([
    { ref: { isA: true }},
    { ref: { isB: true }},
    { ref: { isC: true }}
  ])
})

test('unbinds refs when the collection is unbound', async () => {
  const items = db.collection()
  const spyA = spyUnbind(a)
  const spyB = spyUnbind(b)
  await items.add({ ref: a })
  await items.add({ ref: b })
  await vm.$bindAsArray('items', items)

  expect(spyA).toHaveBeenCalledTimes(0)
  expect(spyB).toHaveBeenCalledTimes(0)

  vm.$unbind('items')

  expect(spyA).toHaveBeenCalledTimes(1)
  expect(spyB).toHaveBeenCalledTimes(1)

  spyA.mockRestore()
  spyB.mockRestore()
})

test('unbinds nested refs when the collection is unbound', async () => {
  const items = db.collection()
  const spyA = spyUnbind(a)
  await items.add({ ref: { ref: a }})
  await vm.$bindAsArray('items', items)

  expect(spyA).toHaveBeenCalledTimes(0)

  vm.$unbind('items')
  expect(spyA).toHaveBeenCalledTimes(1)

  spyA.mockRestore()
})

test('unbinds refs when items are removed', async () => {
  const spyA = spyUnbind(a)
  await vm.$bindAsArray('items', collection)
  expect(spyA).toHaveBeenCalledTimes(0)

  await collection.doc(vm.items[0].id).delete()
  expect(spyA).toHaveBeenCalledTimes(1)

  spyA.mockRestore()
})

test('unbinds refs when items are modified', async () => {
  const spyA = spyUnbind(a)
  await vm.$bindAsArray('items', collection)
  expect(spyA).toHaveBeenCalledTimes(0)

  await first.set({ b })

  expect(spyA).toHaveBeenCalledTimes(1)

  spyA.mockRestore()
})

test('updates when modifying an item', async () => {
  await vm.$bindAsArray('items', collection)

  await first.update({ newThing: true })
  await delay(5)

  expect(vm.items).toEqual([
    { ref: { isA: true }, newThing: true },
    { ref: { isB: true }}
  ])
})

test('keeps old data of refs when modifying an item', async () => {
  await vm.$bindAsArray('items', collection)
  await first.update({ newThing: true })

  expect(vm.items[0]).toEqual({
    ref: { isA: true },
    newThing: true
  })
})

test('respects provided maxRefDepth', async () => {
  const a = db.collection().doc()
  const b = db.collection().doc()
  const c = db.collection().doc()
  const d = db.collection().doc()
  await a.set({ b })
  await b.set({ c })
  await d.set({ isD: true })
  await c.set({ d })
  const collection = db.collection()
  await collection.add({ a })

  await vm.$bindAsArray('items', collection, { maxRefDepth: 1 })
  expect(vm.items).toEqual([{
    a: {
      b: b.path
    }
  }])

  await vm.$bindAsArray('items', collection, { maxRefDepth: 3 })
  expect(vm.items).toEqual([{
    a: {
      b: {
        c: {
          d: d.path
        }
      }
    }
  }])
})

test('does not fail with cyclic refs', async () => {
  const item = db.collection().doc()
  await item.set({ item })
  const collection = db.collection()
  await collection.add({ item })
  await vm.$bindAsArray('items', collection, { maxRefDepth: 5 })

  expect(vm.items).toEqual([{
    // it's easy to see we stop at 5 and we have 5 brackets
    item: {
      item: {
        item: {
          item: {
            item: {
              item: item.path
            }
          }
        }
      }
    }
  }])
})
