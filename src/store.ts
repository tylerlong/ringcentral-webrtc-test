import { manage } from 'manate';

export class Store {
  public message = 'Hello, world!';
}

const store = manage(new Store());

export default store;
