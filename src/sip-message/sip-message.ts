interface Dict {
  [key: string]: string;
}

class SipMessage {
  public subject: string;
  public headers: Dict;
  public body: string;

  public constructor(subject = '', headers = {}, body = '') {
    this.subject = subject;
    this.headers = headers;
    this.body = body;
  }

  public toString() {
    return [
      this.subject,
      ...Object.keys(this.headers).map((key) => `${key}: ${this.headers[key]}`),
      '',
      this.body,
    ].join('\r\n');
  }
}

export default SipMessage;
