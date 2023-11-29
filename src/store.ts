import { manage } from 'manate';

import type { InboundMessage } from './sip-message';

export class Store {
  public inviteMessage: InboundMessage | undefined = undefined;
}

const store = manage(new Store());

export default store;
