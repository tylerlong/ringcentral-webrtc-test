import OutboundMessage from '.';
import { branch } from '../../utils';

let cseq = Math.floor(Math.random() * 10000);

class RequestMessage extends OutboundMessage {
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
    const newMessage = new RequestMessage(this.subject, { ...this.headers }, this.body);
    newMessage.newCseq();
    if (newMessage.headers.Via) {
      newMessage.headers.Via = newMessage.headers.Via.replace(/;branch=z9hG4bK.+?$/, `;branch=${branch()}`);
    }
    return newMessage;
  }
}

export default RequestMessage;
