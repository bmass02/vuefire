import * as firebase from 'firebase';
declare module 'vue/types/vue' {
  interface Vue {
    $bindAsObject: (key: string, ref: firebase.database.Reference | firebase.firestore.DocumentReference, errorCallback?: (err: any) => any, readyCallback?: () => any) => void
    $bindAsArray: (key: string, ref: firebase.database.Reference | firebase.database.Query | firebase.firestore.CollectionReference | firebase.firestore.Query, errorCallback?: (err: any) => any, readyCallback?: () => any) => void
    $unbind: (key: string) => void
  }
}