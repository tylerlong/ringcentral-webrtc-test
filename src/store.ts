import { manage, autoRun } from 'manate';

import type { InboundMessage } from './sip-message';
import type Softphone from './softphone';

export class Store {
  public messages = ['Hello, world!'];
  public inviteMessage: InboundMessage | undefined = undefined;
  public answerCall(softphone: Softphone) {
    if (this.inviteMessage) {
      softphone.answer(this.inviteMessage!);
      this.inviteMessage = undefined;
    }
  }
}

const store = manage(new Store());

const { start } = autoRun(store, () => {
  console.log(store.messages[store.messages.length - 1]);
});
start();

export default store;
