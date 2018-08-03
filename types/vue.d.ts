import * as firebase from 'firebase';
import Vue from 'vue';

declare module "vue/types/vue" {
  interface Vue {
    $firebase: typeof firebase
    $bindAsObject(key: string, source: firebase.firestore.DocumentReference): Promise<firebase.firestore.DocumentSnapshot>;
    $bindAsObject(key: string, source: firebase.database.Reference): Promise<firebase.database.DataSnapshot>;
    $bindAsArray(key: string, source: firebase.firestore.CollectionReference | firebase.firestore.Query): Promise<firebase.firestore.QuerySnapshot>;
    $bindAsArray(key: string, source: firebase.database.Reference): Promise<firebase.database.DataSnapshot>;
    $unbind(key: string): void;
  }
}
