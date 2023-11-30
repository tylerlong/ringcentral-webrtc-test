import type RingCentral from '@rc-ex/core';
import { v4 as uuid } from 'uuid';
import type SipInfoResponse from '@rc-ex/core/lib/definitions/SipInfoResponse';
import { EventEmitter } from 'events';

import type { OutboundMessage } from './sip-message';
import { InboundMessage, RequestMessage, ResponseMessage } from './sip-message';
import { generateAuthorization } from './utils';

class Softphone extends EventEmitter {
  public rc: RingCentral;
  public sipInfo: SipInfoResponse;
  public ws: WebSocket;
  public fakeDomain = uuid() + '.invalid';
  public fakeEmail = uuid() + '@' + this.fakeDomain;
  public fromTag = uuid();
  public callId = uuid();

  public constructor(rc: RingCentral) {
    super();
    this.rc = rc;
  }
  public async register() {
    const r = await this.rc
      .restapi()
      .clientInfo()
      .sipProvision()
      .post({
        sipInfo: [{ transport: 'WSS' }],
      });
    this.sipInfo = r.sipInfo[0];
    this.ws = new WebSocket('wss://' + this.sipInfo.outboundProxy, 'sip');
    this.ws.addEventListener('open', (e) => {
      this.emit('wsOpen', e);
    });
    this.ws.addEventListener('message', (e) => {
      this.emit('wsMessage', e.data);
      this.emit('message', InboundMessage.fromString(e.data));
    });
    const oldSend = this.ws.send.bind(this.ws);
    this.ws.send = (arg: any) => {
      this.emit('wsSend', arg);
      oldSend(arg);
    };

    const openHandler = async () => {
      this.off('wsOpen', openHandler);
      const requestMessage = new RequestMessage(`REGISTER sip:${this.sipInfo.domain} SIP/2.0`, {
        'Call-Id': this.callId,
        Contact: `<sip:${this.fakeEmail};transport=ws>;expires=600`,
        From: `<sip:${this.sipInfo.username}@${this.sipInfo.domain}>;tag=${this.fromTag}`,
        To: `<sip:${this.sipInfo.username}@${this.sipInfo.domain}>`,
        Via: `SIP/2.0/WSS ${this.fakeDomain};branch=${uuid()}`,
      });
      const inboundMessage = await this.send(requestMessage);
      const wwwAuth = inboundMessage.headers['Www-Authenticate'] || inboundMessage!.headers['WWW-Authenticate'];
      const nonce = wwwAuth.match(/, nonce="(.+?)"/)![1];
      const newMessage = requestMessage.fork();
      newMessage.headers.Authorization = generateAuthorization(this.sipInfo, 'REGISTER', nonce);
      this.send(newMessage);
    };
    this.on('wsOpen', openHandler);

    this.on('message', async (inboundMessage: InboundMessage) => {
      if (inboundMessage.subject.startsWith('INVITE sip:')) {
        this.emit('invite', inboundMessage);
      }
    });
  }

  public send(message: OutboundMessage) {
    this.ws.send(message.toString());
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
        this.off('message', messageListerner);
        resolve(inboundMessage);
      };
      this.on('message', messageListerner);
    });
  }

  public async answer(inviteMessage: InboundMessage) {
    const peerConnection = new RTCPeerConnection();
    peerConnection.addEventListener('track', (e: any) => {
      const remoteAudio = document.getElementById('remoteAudio') as HTMLAudioElement;
      remoteAudio.srcObject = e.streams[0];
      remoteAudio.play();
    });
    await peerConnection.setRemoteDescription({
      sdp: inviteMessage.body,
      type: 'offer',
    });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    const newMessage = new ResponseMessage(
      inviteMessage,
      200,
      {
        Contact: `<sip:${this.fakeEmail};transport=ws>`,
        'Content-Type': 'application/sdp',
      },
      peerConnection.localDescription!.sdp,
    );
    this.send(newMessage);
  }
}

export default Softphone;
