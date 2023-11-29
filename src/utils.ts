import type SipInfoResponse from '@rc-ex/core/lib/definitions/SipInfoResponse';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

const generateResponse = (sipInfo: SipInfoResponse, method: string, nonce: string) => {
  const ha1 = md5(`${sipInfo.authorizationId}:${sipInfo.domain}:${sipInfo.password}`);
  const ha2 = md5(`${method}:sip:${sipInfo.domain}`);
  const response = md5(`${ha1}:${nonce}:${ha2}`);
  return response;
};

/*
Sample input:
const sipInfo = {
  "password": "Li12x8E",
  "authorizationId": "801559893004",
  "domain": "sip.devtest.ringcentral.com",
}
const method = 'REGISTER'
const nonce = 'ZWaikWVmoWVk71y4c8akwQ5yWzg/ZNiV'
*/
export const generateAuthorization = (sipInfo: SipInfoResponse, method: string, nonce: string) => {
  const response = generateResponse(sipInfo, method, nonce);
  return `Digest algorithm=MD5, username="${sipInfo.authorizationId}", realm="${sipInfo.domain}", nonce="${nonce}", uri="sip:${sipInfo.domain}", response="${response}"`;
};

export const branch = () => 'z9hG4bK' + uuid();
