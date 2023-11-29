import RingCentral from '@rc-ex/core';
import { v4 as uuid } from 'uuid';

import store from './store';
import { RequestSipMessage } from './sip-message';

export const createPhone = async () => {
  store.messages.push('Creating phone...');
  const rc = new RingCentral({
    server: process.env.RINGCENTRAL_SERVER_URL,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
  });
  await rc.authorize({ jwt: process.env.RINGCENTRAL_JWT_TOKEN });
  store.messages.push(rc.token.access_token);
  const r = await rc
    .restapi()
    .clientInfo()
    .sipProvision()
    .post({
      sipInfo: [{ transport: 'WSS' }],
    });
  store.messages.push(JSON.stringify(r, null, 2));
  const sipInfo = r.sipInfo[0];
  const ws = new WebSocket('wss://' + sipInfo.outboundProxy, 'sip');
  ws.addEventListener('open', () => {
    store.messages.push('WebSocket opened');
    onOpen();
  });
  ws.addEventListener('message', (e: any) => {
    store.messages.push('Receiving...\n' + e.data);
  });
  const temp = ws.send.bind(ws);
  ws.send = (arg: any) => {
    store.messages.push('Sending...\n' + arg);
    temp(arg);
  };
  const fakeDomain = uuid() + '.invalid';
  const fakeEmail = uuid() + '@' + fakeDomain;
  const fromTag = uuid();
  const callId = uuid();
  const branch = () => 'z9hG4bK' + uuid();
  const onOpen = () => {
    const requestSipMessage = new RequestSipMessage(`REGISTER sip:${sipInfo.domain} SIP/2.0`, {
      'Call-ID': callId,
      Contact: `<sip:${fakeEmail};transport=ws>;expires=600`,
      From: `<sip:${sipInfo.username}@${sipInfo.domain}>;tag=${fromTag}`,
      To: `<sip:${sipInfo.username}@${sipInfo.domain}>`,
      Via: `SIP/2.0/WSS ${fakeDomain};branch=${branch()}`,
    });
    ws.send(requestSipMessage.toString());
  };
};
