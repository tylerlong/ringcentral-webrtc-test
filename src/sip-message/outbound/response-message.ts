import { v4 as uuid } from 'uuid';

import OutboundMessage from '.';
import responseCodes from '../response-codes';
import type InboundMessage from '../inbound';

const toTag = uuid();

class ResponseMessage extends OutboundMessage {
  // eslint-disable-next-line max-params
  public constructor(inboundMessage: InboundMessage, responseCode: number, headers = {}, body = '') {
    super(undefined, { ...headers }, body);
    this.subject = `SIP/2.0 ${responseCode} ${responseCodes[responseCode]}`;
    for (const key of ['Via', 'From', 'Call-ID', 'Call-Id', 'CSeq']) {
      if (inboundMessage.headers[key]) {
        this.headers[key] = inboundMessage.headers[key];
      }
    }
    this.headers.To = `${inboundMessage.headers.To};tag=${toTag}`;
    this.headers.Supported = 'outbound';
    this.headers = { ...this.headers, ...headers }; // user provided headers override auto headers
  }
}

export default ResponseMessage;
