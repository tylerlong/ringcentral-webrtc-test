# RingCentral WebRTC Test


## References

- https://telnyx.com/resources/the-beginners-guide-to-sip-headers


## !!Pitfall

- If you don't interact with the document, the audio won't play!
  - It's enforced by browser's autoplay policy


## Todo

- Revoke Softphone
- Auto refresh register
- Pending issues:
  - node-datachannel: cannot answer the call. after reply to invite, server will BYE
  - werift: can answer the call, but no track coming.
    - enable debug mode helps: env var: DEBUG=werift*


## Notes

How to play the saved audio?

```
play -b 8 -e signed -c 1 -r 8000 -G test.raw
```
But the quality is not good.
