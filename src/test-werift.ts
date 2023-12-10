/*
得到的声音质量很差，背景噪音大。
我觉得是时间的问题。因为 RTP 包都有时间戳的。简单的 append 在一起，时间和数据上可能对不上，导致大的噪音。
更新：其实得到的音频是没问题的，是播放方式有问题。可以这么播放：play -b 8 -r 8000 -e mu-law test.raw
*/
import RingCentral from '@rc-ex/core';
import { RTCPeerConnection, RTCRtpCodecParameters, RtpPacket, isRtcp, isMedia } from 'werift';

import Softphone from './softphone';
import fs from 'fs';

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
      codecs: {
        audio: [
          new RTCRtpCodecParameters({
            mimeType: 'audio/pcmu',
            clockRate: 8000,
            channels: 1,
            payloadType: 0,
          }),
        ],
      },
    });
    // rtcPeerConntion.onTransceiverAdded.subscribe((transceiver) => {
    //   console.log('onTransceiverAdded', transceiver.id);
    //   setTimeout(() => {
    //     console.log(transceiver);
    //   }, 2000);
    // });
    // transceiver.onTrack.subscribe((track) => {
    //   console.log('onTrack1', track);
    // });
    // transceiver.receiver.onRtcp.subscribe((rtcp) => {
    //   console.log('onRtcp1', rtcp);
    // });
    // transceiver.sender.onRtcp.subscribe((rtcp) => {
    //   console.log('onRtcp11', rtcp);
    // });
    // transceiver.dtlsTransport.iceTransport.connection.onData.subscribe((data) => {
    //   // console.log(data);
    //   const dec = transceiver.dtlsTransport.srtp.decrypt(data);
    //   const rtp = RtpPacket.deSerialize(dec);
    //   console.log(rtp);
    // });
    // });

    // rtcPeerConntion.onRemoteTransceiverAdded.subscribe((transceiver) => {
    //   console.log('onRemoteTransceiverAdded', transceiver.id);
    //   transceiver.onTrack.subscribe((track) => {
    //     console.log('onTrack2', track);
    //   });
    //   transceiver.receiver.onRtcp.subscribe((rtcp) => {
    //     console.log('onRtcp2', rtcp);
    //   });
    //   transceiver.sender.onRtcp.subscribe((rtcp) => {
    //     console.log('onRtcp22', rtcp);
    //   });
    // });

    setTimeout(() => {
      const dtlsTransport = rtcPeerConntion.dtlsTransports[0];
      if (fs.existsSync('test.raw')) {
        fs.unlinkSync('test.raw');
      }
      const writeStream = fs.createWriteStream('test.raw', { flags: 'a' });
      dtlsTransport.iceTransport.connection.onData.subscribe((data) => {
        if (!isMedia(data)) {
          console.log('is not media');
          return;
        }
        if (isRtcp(data)) {
          console.log('is rtcp'); // never invoked
          return;
        }
        console.log('got media RTP');
        // console.log(data);
        const dec = dtlsTransport.srtp.decrypt(data);
        const rtp = RtpPacket.deSerialize(dec);
        // console.log(rtp);
        writeStream.write(rtp.payload);
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
