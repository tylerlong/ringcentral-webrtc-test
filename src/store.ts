import { manage } from 'manate';

export class Store {
  public messages = ['Hello, world!'];
}

const store = manage(new Store());

export default store;
