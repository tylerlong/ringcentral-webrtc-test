import RingCentral from '@rc-ex/core';
import { v4 as uuid } from 'uuid';
import EventEmitter from 'manate/event-emitter';

import store from './store';
import type { SipMessage } from './sip-message';
import { InboundSipMessage, RequestSipMessage } from './sip-message';
import { branch, generateAuthorization } from './utils';

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
  const eventEmitter = new EventEmitter();
  ws.addEventListener('message', (e: any) => {
    store.messages.push('Receiving...\n' + e.data);
    eventEmitter.emit(InboundSipMessage.fromString(e.data));
  });
  const oldSend = ws.send.bind(ws);
  ws.send = (arg: any) => {
    store.messages.push('Sending...\n' + arg);
    oldSend(arg);
  };
  const send = (message: SipMessage) => {
    ws.send(message.toString());
    return new Promise<InboundSipMessage>((resolve) => {
      const messageListerner = (inboundSipMessage: InboundSipMessage) => {
        if (inboundSipMessage.headers.CSeq !== message.headers.CSeq) {
          return;
        }
        if (
          inboundSipMessage.subject === 'SIP/2.0 100 Trying' ||
          inboundSipMessage.subject === 'SIP/2.0 183 Session Progress'
        ) {
          return; // ignore
        }
        eventEmitter.off(messageListerner);
        resolve(inboundSipMessage);
      };
      eventEmitter.on(messageListerner);
    });
  };

  const fakeDomain = uuid() + '.invalid';
  const fakeEmail = uuid() + '@' + fakeDomain;
  const fromTag = uuid();
  const callId = uuid();
  const onOpen = async () => {
    const requestSipMessage = new RequestSipMessage(`REGISTER sip:${sipInfo.domain} SIP/2.0`, {
      'Call-ID': callId,
      Contact: `<sip:${fakeEmail};transport=ws>;expires=600`,
      From: `<sip:${sipInfo.username}@${sipInfo.domain}>;tag=${fromTag}`,
      To: `<sip:${sipInfo.username}@${sipInfo.domain}>`,
      Via: `SIP/2.0/WSS ${fakeDomain};branch=${branch()}`,
    });
    const inboundSipMessage = await send(requestSipMessage);
    const wwwAuth = inboundSipMessage.headers['Www-Authenticate'] || inboundSipMessage!.headers['WWW-Authenticate'];
    const nonce = wwwAuth.match(/, nonce="(.+?)"/)![1];
    const newMessage = requestSipMessage.fork();
    newMessage.headers.Authorization = generateAuthorization(sipInfo, 'REGISTER', nonce);
    send(newMessage);
  };
};
