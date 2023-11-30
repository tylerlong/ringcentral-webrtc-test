import RingCentral from '@rc-ex/core';

import Softphone from './softphone';

const main = async () => {
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
  await softphone.register();
  softphone.on('invite', async (inviteMessage) => {
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
