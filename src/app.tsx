import React, { useEffect, useState } from 'react';
import { auto } from 'manate/react';
import { Button } from 'antd';
import RingCentral from '@rc-ex/core';
import { Typography } from 'antd';

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
      const softphone = new Softphone(rc, () => {
        const rtcPeerConntion = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        return rtcPeerConntion as any;
      });
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
      softphone.on('track', (track) => {
        const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
        remoteAudio.srcObject = track.streams[0];
        remoteAudio.play();
      });
    };
    initSoftphone();
  }, []);

  const { store } = props;
  const render = () => (
    <>
      <Typography.Title>RingCentral WebRTC Demo</Typography.Title>
      {store.inviteMessage && (
        <Button
          size="large"
          type="primary"
          block={true}
          onClick={() => {
            softphone.answer(store.inviteMessage);
            store.inviteMessage = undefined;
          }}
        >
          Answer the call
        </Button>
      )}
    </>
  );
  return auto(render, props);
};

export default App;
