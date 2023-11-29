import OutboundSipMessage from './outbound-sip-message';
import { branch } from '../../utils';

let cseq = Math.floor(Math.random() * 10000);

class RequestSipMessage extends OutboundSipMessage {
  public constructor(subject = '', headers = {}, body = '') {
    super(subject, headers, body);
    this.headers['Max-Forwards'] = '70';
    this.newCseq();
  }

  public newCseq() {
    this.headers.CSeq = `${++cseq} ${this.subject.split(' ')[0]}`;
  }

  public reuseCseq() {
    this.headers.CSeq = `${--cseq} ${this.subject.split(' ')[0]}`;
  }

  public fork() {
    const newMessage = new RequestSipMessage(this.subject, { ...this.headers }, this.body);
    newMessage.newCseq();
    if (newMessage.headers.Via) {
      newMessage.headers.Via = newMessage.headers.Via.replace(/;branch=z9hG4bK.+?$/, `;branch=${branch()}`);
    }
    return newMessage;
  }
}

export default RequestSipMessage;
