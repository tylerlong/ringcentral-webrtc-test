import RingCentral from '@rc-ex/core';
import { RTCPeerConnection, RtpPacket } from 'werift';

import Softphone from './softphone';

const main = async () => {
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
    setTimeout(() => {
      console.log(rtcPeerConntion.dtlsTransports.length);
      const dtlsTransport = rtcPeerConntion.dtlsTransports[0];
      dtlsTransport.iceTransport.connection.onData.subscribe((data) => {
        console.log('got data');
        console.log(data);
        const dec = dtlsTransport.srtp.decrypt(data);
        const rtp = RtpPacket.deSerialize(dec);
        console.log(rtp);
      });
    }, 2000);
    return rtcPeerConntion as any;
  });
  softphone.on('wsMessage', (message) => {
    console.log('Receiving...\n' + message);
  });
  softphone.on('wsSend', (message) => {
    console.log('Sending...\n' + message);
  });
  await softphone.register();
  softphone.once('invite', async (inviteMessage) => {
    setTimeout(() => {
      softphone.answer(inviteMessage);
    }, 1000);
  });
  softphone.on('track', (track) => {
    console.log('got track');
    console.log(track);
  });
};
main();
