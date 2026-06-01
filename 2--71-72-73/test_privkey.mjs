import crypto from 'crypto';
import { createHash } from 'crypto';
import EC from 'elliptic';
import bs58 from 'bs58';

const ec = new EC.ec('secp256k1');

function privkeyToAddress(privkeyInt, compressed = true) {
  const privkeyHex = BigInt(privkeyInt).toString(16).padStart(64, '0');
  const key = ec.keyFromPrivate(privkeyHex);
  const pubkey = key.getPublic();
  const x = pubkey.getX().toString(16).padStart(64, '0');
  const y = pubkey.getY().toString(16).padStart(64, '0');

  let pubkeyBuffer;
  if (compressed) {
    const prefix = parseInt(y.slice(-1), 16) % 2 === 0 ? '02' : '03';
    pubkeyBuffer = Buffer.from(prefix + x, 'hex');
  } else {
    pubkeyBuffer = Buffer.from('04' + x + y, 'hex');
  }

  const sha256 = createHash('sha256').update(pubkeyBuffer).digest();
  const ripemd160 = createHash('ripemd160').update(sha256).digest();
  const payload = Buffer.concat([Buffer.from([0x00]), ripemd160]);
  const checksum = createHash('sha256')
    .update(createHash('sha256').update(payload).digest())
    .digest()
    .slice(0, 4);
  
  return bs58.encode(Buffer.concat([payload, checksum]));
}

const privkey = '0x0000000000000000000000000000000000000000000000400000000000000000';
const addrComp = privkeyToAddress(privkey, true);
const addrUncomp = privkeyToAddress(privkey, false);
console.log('Privkey:', privkey);
console.log('Addr Comprimido:', addrComp);
console.log('Addr Descomprimido:', addrUncomp);
console.log('');
console.log('Esperados:');
console.log('Addr Comprimido: 19rsCtDEBJFGAuStRqZHx9utR97iugzaHr');
console.log('Addr Descomprimido: 1A3yMf9PogaoG6sCZME36VFz5Bzt6EFSGF');
