import crypto from "crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");

// Get raw bytes
const rawPrivate = privateKey.export({ type: "pkcs8", format: "der" });
// WireGuard expects the 32-byte private key at the end of the DER for X25519
const wireguardPrivate = rawPrivate.slice(-32).toString("base64");

// Get raw public key
const rawPublic = publicKey.export({ type: "spki", format: "der" });
// Last 32 bytes are the public key
const wireguardPublic = rawPublic.slice(-32).toString("base64");

console.log("WireGuard Private:", wireguardPrivate);
console.log("WireGuard Public :", wireguardPublic);