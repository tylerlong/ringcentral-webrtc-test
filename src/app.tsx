import React, { useEffect, useState } from 'react';
import { auto } from 'manate/react';
import { Button } from 'antd';
import RingCentral from '@rc-ex/core';

import type { Store } from './store';
import Softphone from './softphone';

const App = (props: { store: Store }) => {
  const [softphone, setSoftphone] = useState<Softphone>();
  useEffect(() => {
    const initSoftphone = async () => {
      const rc = new RingCentral({
        server: process.env.RINGCENTRAL_SERVER_URL,
        clientId: process.env.RINGCENTRAL_CLIENT_ID,
        clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
      });
      await rc.authorize({ jwt: process.env.RINGCENTRAL_JWT_TOKEN });
      const softphone = new Softphone(rc);
      softphone.on('wsMessage', (message) => {
        console.log('Receiving...\n' + message);
      });
      softphone.on('wsSend', (message) => {
        console.log('Sending...\n' + message);
      });
      setSoftphone(softphone);
      await softphone.register();
      softphone.on('invite', (inviteMessage) => {
        props.store.inviteMessage = inviteMessage;
      });
    };
    initSoftphone();
  }, []);

  // scroll to bottom on new messages
  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, [props.store.messages.length]);

  const { store } = props;
  const render = () => (
    <>
      <pre>{store.messages.join('\n\n')}</pre>
      {store.inviteMessage && (
        <Button type="primary" block={true} onClick={() => store.answerCall(softphone)}>
          Answer the call
        </Button>
      )}
    </>
  );
  return auto(render, props);
};

export default App;
