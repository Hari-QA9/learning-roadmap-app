// Creates the two keys that switch on phone & desktop notifications. Run once: npm run vapid-keys
// Then copy both lines into backend/.env (and your hosting provider's settings). Keep the private key secret.
const crypto = require('crypto');

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
console.log('\nAdd these two lines to backend/.env (and to Render → Environment when hosted):\n');
console.log(`VAPID_PUBLIC_KEY=${b64u(ecdh.getPublicKey())}`);
const priv = ecdh.getPrivateKey();
console.log(`VAPID_PRIVATE_KEY=${b64u(Buffer.concat([Buffer.alloc(32 - priv.length), priv]))}\n`);
console.log('Keep the private key secret. If you ever change these keys, members need to turn notifications on again.\n');
