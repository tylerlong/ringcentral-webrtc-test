import RingCentral from '@rc-ex/core';
import { v4 as uuid } from 'uuid';
import EventEmitter from 'manate/event-emitter';

import store from './store';
import type { OutboundMessage } from './sip-message';
import { InboundMessage, RequestMessage, ResponseMessage } from './sip-message';
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
  const messageListener = new EventEmitter();
  ws.addEventListener('message', (e: any) => {
    store.messages.push('Receiving...\n' + e.data);
    messageListener.emit(InboundMessage.fromString(e.data));
  });
  const oldSend = ws.send.bind(ws);
  ws.send = (arg: any) => {
    store.messages.push('Sending...\n' + arg);
    oldSend(arg);
  };
  const send = (message: OutboundMessage) => {
    ws.send(message.toString());
    return new Promise<InboundMessage>((resolve) => {
      const messageListerner = (inboundMessage: InboundMessage) => {
        if (inboundMessage.headers.CSeq !== message.headers.CSeq) {
          return;
        }
        if (
          inboundMessage.subject === 'SIP/2.0 100 Trying' ||
          inboundMessage.subject === 'SIP/2.0 183 Session Progress'
        ) {
          return; // ignore
        }
        messageListener.off(messageListerner);
        resolve(inboundMessage);
      };
      messageListener.on(messageListerner);
    });
  };

  const fakeDomain = uuid() + '.invalid';
  const fakeEmail = uuid() + '@' + fakeDomain;
  const fromTag = uuid();
  const callId = uuid();
  const onOpen = async () => {
    const requestMessage = new RequestMessage(`REGISTER sip:${sipInfo.domain} SIP/2.0`, {
      'Call-ID': callId,
      Contact: `<sip:${fakeEmail};transport=ws>;expires=600`,
      From: `<sip:${sipInfo.username}@${sipInfo.domain}>;tag=${fromTag}`,
      To: `<sip:${sipInfo.username}@${sipInfo.domain}>`,
      Via: `SIP/2.0/WSS ${fakeDomain};branch=${branch()}`,
    });
    const inboundMessage = await send(requestMessage);
    const wwwAuth = inboundMessage.headers['Www-Authenticate'] || inboundMessage!.headers['WWW-Authenticate'];
    const nonce = wwwAuth.match(/, nonce="(.+?)"/)![1];
    const newMessage = requestMessage.fork();
    newMessage.headers.Authorization = generateAuthorization(sipInfo, 'REGISTER', nonce);
    send(newMessage);
  };

  messageListener.on(async (inboundMessage: InboundMessage) => {
    if (inboundMessage.subject.startsWith('INVITE sip:')) {
      const peerConnection = new RTCPeerConnection({
        iceServers: sipInfo.stunServers.map((s) => ({ urls: `stun:${s}` })), // todo: this line is optional?
      });
      peerConnection.addEventListener('track', (e: any) => {
        const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
        remoteAudio.srcObject = e.streams[0];
        remoteAudio.play();
      });
      await peerConnection.setRemoteDescription({
        sdp: inboundMessage.body,
        type: 'offer',
      });
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      const newMessage = new ResponseMessage(
        inboundMessage,
        200,
        {
          Contact: `<sip:${fakeEmail};transport=ws>`,
          'Content-Type': 'application/sdp',
        },
        peerConnection.localDescription!.sdp,
      );
      send(newMessage);
    }
  });
};
