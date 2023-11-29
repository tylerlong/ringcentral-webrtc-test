import { manage, autoRun } from 'manate';

export class Store {
  public messages = ['Hello, world!'];
}

const store = manage(new Store());

const { start } = autoRun(store, () => {
  console.log(store.messages[store.messages.length - 1]);
});
start();

export default store;
