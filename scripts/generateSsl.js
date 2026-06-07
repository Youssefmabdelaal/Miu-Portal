const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, '../config/ssl');

if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

const keyPath = path.join(sslDir, 'key.pem');
const certPath = path.join(sslDir, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('SSL certificates already exist.');
  process.exit(0);
}

console.log('Generating new RSA key pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);

console.log('Creating self-signed certificate...');
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'US' },
  { shortName: 'ST', value: 'Virginia' },
  { name: 'localityName', value: 'Blacksburg' },
  { name: 'organizationName', value: 'Smart University' },
  { shortName: 'OU', value: 'Test' }
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([
  { name: 'basicConstraints', cA: true },
  { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true, clientAuth: true, codeSigning: true, emailProtection: true, timeStamping: true },
  { name: 'nsCertType', client: true, server: true, email: true, objsign: true, sslCA: true, emailCA: true, objCA: true },
  { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] }
]);

cert.sign(keys.privateKey);

const pemCert = forge.pki.certificateToPem(cert);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(certPath, pemCert);
fs.writeFileSync(keyPath, pemKey);

console.log('SSL certificates generated successfully in config/ssl!');
