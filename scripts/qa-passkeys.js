// Actual cryptographic verification with a synthetic authenticator. No device or account is contacted.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {encodeCBOR}=require('@levischuck/tiny-cbor');
const b64=x=>Buffer.from(x).toString('base64url');
const hash=x=>crypto.createHash('sha256').update(x).digest();
(async()=>{
 const W=await import('@simplewebauthn/server');
 const origin='https://wonder.test',rpID='wonder.test';
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'});
 const cose=Buffer.from(encodeCBOR(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(jwk.y,'base64url'))]])));
 const credentialId=crypto.randomBytes(32),id=b64(credentialId);
 const opts=await W.generateRegistrationOptions({rpID,rpName:'WONDER',userName:'synthetic@invalid.local',authenticatorSelection:{residentKey:'required',userVerification:'required'}});
 const clientData=Buffer.from(JSON.stringify({type:'webauthn.create',challenge:opts.challenge,origin,crossOrigin:false}));
 const len=Buffer.alloc(2);len.writeUInt16BE(credentialId.length);
 const authData=Buffer.concat([hash(rpID),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),len,credentialId,cose]);
 const attestation=Buffer.from(encodeCBOR(new Map([['fmt','none'],['authData',new Uint8Array(authData)],['attStmt',new Map()]])));
 const response={id,rawId:id,type:'public-key',response:{clientDataJSON:b64(clientData),attestationObject:b64(attestation),transports:['internal']},clientExtensionResults:{credProps:{rk:true}}};
 const registered=await W.verifyRegistrationResponse({response,expectedChallenge:opts.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
 assert.equal(registered.verified,true);
 const credential=registered.registrationInfo.credential;
 const options=await W.generateAuthenticationOptions({rpID,userVerification:'required'});
 function assertion({challenge=options.challenge,assertionOrigin=origin,flags=5,counter=1}={}){
  const data=Buffer.from(JSON.stringify({type:'webauthn.get',challenge,origin:assertionOrigin,crossOrigin:false}));
  const c=Buffer.alloc(4);c.writeUInt32BE(counter);const auth=Buffer.concat([hash(rpID),Buffer.from([flags]),c]);
  const signature=crypto.sign('sha256',Buffer.concat([auth,hash(data)]),privateKey);
  return {id,rawId:id,type:'public-key',response:{authenticatorData:b64(auth),clientDataJSON:b64(data),signature:b64(signature)},clientExtensionResults:{}};
 }
 const verify=response=>W.verifyAuthenticationResponse({response,credential,expectedChallenge:options.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
 assert.equal((await verify(assertion())).verified,true);
 await assert.rejects(()=>verify(assertion({assertionOrigin:'https://attacker.test'})));
 await assert.rejects(()=>verify(assertion({challenge:'old-challenge'})));
 await assert.rejects(()=>verify(assertion({flags:1})));
 const signed=assertion();signed.response.signature=b64(crypto.randomBytes(64));
 await assert.rejects(async()=>{const r=await verify(signed);assert.equal(r.verified,true);});
 credential.counter=1;await assert.rejects(()=>verify(assertion({counter:1})));
 console.log('PASS: real WebAuthn registration and signed assertion; foreign origin, wrong challenge, absent user verification, invalid signature, and counter replay rejected. Physical Face ID remains a device acceptance test.');
})().catch(e=>{console.error(e);process.exitCode=1;});
