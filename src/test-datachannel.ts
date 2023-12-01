/*
Limitation of the node-datachannel library: no way to get media from track.
I would like to try the C++ library
*/
import RingCentral from '@rc-ex/core';
import WebSocket from 'isomorphic-ws';
import { v4 as uuid } from 'uuid';
import EventEmitter from 'events';
import nodeDataChannel from 'node-datachannel';

import type { OutboundMessage } from './sip-message';
import { InboundMessage, ResponseMessage } from './sip-message';
import { RequestMessage } from './sip-message';
import { generateAuthorization } from './utils';

const main = async () => {
  // nodeDataChannel.initLogger('Debug');

  const rc = new RingCentral({
    server: process.env.RINGCENTRAL_SERVER_URL,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
  });
  await rc.authorize({ jwt: process.env.RINGCENTRAL_JWT_TOKEN });
  const r = await rc
    .restapi()
    .clientInfo()
    .sipProvision()
    .post({
      sipInfo: [{ transport: 'WSS' }],
    });
  const sipInfo = r.sipInfo[0];
  const ws = new WebSocket('wss://' + sipInfo.outboundProxy, 'sip');
  const emitter = new EventEmitter();
  ws.addEventListener('message', (e) => {
    console.log('Receving...\n' + e.data);
    emitter.emit('message', InboundMessage.fromString(e.data));
  });
  const oldSend = ws.send.bind(ws);
  ws.send = (arg: string) => {
    console.log('Sending...\n' + arg);
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
        emitter.off('message', messageListerner);
        resolve(inboundMessage);
      };
      emitter.on('message', messageListerner);
    });
  };

  const fakeDomain = uuid() + '.invalid';
  const fakeEmail = uuid() + '@' + fakeDomain;
  const fromTag = uuid();
  const callId = uuid();

  const openHandler = async () => {
    ws.removeEventListener('open', openHandler);
    const requestMessage = new RequestMessage(`REGISTER sip:${sipInfo.domain} SIP/2.0`, {
      'Call-Id': callId,
      Contact: `<sip:${fakeEmail};transport=ws>;expires=600`,
      From: `<sip:${sipInfo.username}@${sipInfo.domain}>;tag=${fromTag}`,
      To: `<sip:${sipInfo.username}@${sipInfo.domain}>`,
      Via: `SIP/2.0/WSS ${fakeDomain};branch=${uuid()}`,
    });
    const inboundMessage = await send(requestMessage);
    const wwwAuth = inboundMessage.headers['Www-Authenticate'] || inboundMessage!.headers['WWW-Authenticate'];
    const nonce = wwwAuth.match(/, nonce="(.+?)"/)![1];
    const newMessage = requestMessage.fork();
    newMessage.headers.Authorization = generateAuthorization(sipInfo, 'REGISTER', nonce);
    send(newMessage);
  };
  ws.addEventListener('open', openHandler);

  // handle incoming INVITE
  let invite = false;
  emitter.on('message', async (inboundMessage: InboundMessage) => {
    if (invite || !inboundMessage.subject.startsWith('INVITE sip:')) {
      return;
    }
    invite = true;
    const peerConnection = new nodeDataChannel.PeerConnection('callee', {
      iceServers: ['stun:stun.l.google.com:19302'],
    });

    const audio = new nodeDataChannel.Audio('audio', 'RecvOnly' as any);
    audio.addAudioCodec(0, 'PCMU/8000');
    audio.addSSRC(8888, 'audio-receive');
    // audio.setBitrate(64000);
    const track = peerConnection.addTrack(audio);
    const session = new nodeDataChannel.RtcpReceivingSession();
    track.setMediaHandler(session);
    track.onMessage(() => {
      console.log('audio message');
    });

    peerConnection.onStateChange((state) => {
      console.log('State: ', state);
    });
    peerConnection.onTrack((track) => {
      console.log('Track: ', track);
      console.log(track);
      const session = new nodeDataChannel.RtcpReceivingSession();
      track.setMediaHandler(session);
      track.onMessage(() => {
        console.log('audio message');
      });
    });
    peerConnection.setRemoteDescription(inboundMessage.body, 'offer' as any);
    peerConnection.onGatheringStateChange((state) => {
      console.log('GatheringState: ', state);
      if (state === 'complete') {
        const newMessage = new ResponseMessage(
          inboundMessage,
          200,
          {
            Contact: `<sip:${fakeEmail};transport=ws>`,
            'Content-Type': 'application/sdp',
          },
          peerConnection.localDescription().sdp,
        );
        send(newMessage);
      }
    });
  });
};
main();
