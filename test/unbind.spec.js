import Vuefire from '../src'
import {
  db,
  tick,
  Vue
} from './helpers'

Vue.use(Vuefire)

let collection, document, vm
beforeEach(async () => {
  collection = db.collection()
  document = db.collection().doc()
  vm = new Vue({
    // purposely set items as null
    // but it's a good practice to set it to an empty array
    data: () => ({
      items: null,
      item: null
    }),
    firestore: {
      items: collection,
      item: document
    }
  })
  await tick()
})

test('manually unbinds a collection', async () => {
  const spy = jest.spyOn(vm.$firebaseBinders['items'], 'unbind')
  vm.$unbind('items')
  expect(spy).toHaveBeenCalled()
  expect(Object.keys(vm.$firebaseBinders)).toEqual(['item'])
  expect(vm.items).toEqual([])
  await collection.add({ text: 'foo' })
  expect(vm.items).toEqual([])
  spy.mockRestore()
})

test('manually unbinds a document', async () => {
  const spy = jest.spyOn(vm.$firebaseBinders['item'], 'unbind')
  vm.$unbind('item')
  expect(spy).toHaveBeenCalled()
  expect(Object.keys(vm.$firebaseBinders)).toEqual(['items'])
  expect(vm.item).toEqual(null)
  await document.update({ foo: 'foo' })
  expect(vm.item).toEqual(null)
  spy.mockRestore()
})
