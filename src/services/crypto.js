/**
 * Production-grade End-to-End Encryption (E2EE) using Browser Web Crypto API (SubtleCrypto)
 * - RSA-OAEP 2048-bit for Key Exchange
 * - AES-GCM 256-bit for High-Speed Message Payload Encryption
 */

// Convert ArrayBuffer to Base64 String
function ab2str(buf) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
}

// Convert Base64 String to ArrayBuffer
function str2ab(str) {
  const binaryString = atob(str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateE2EEKeyPair() {
  if (!window.crypto || !window.crypto.subtle) {
    console.warn('Web Crypto API not available in non-secure context');
    return null;
  }

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk),
  };
}

export function getStoredPrivateKey(userId) {
  return localStorage.getItem(`e2ee_private_key_${userId}`);
}

export function storePrivateKey(userId, privateKeyStr) {
  localStorage.setItem(`e2ee_private_key_${userId}`, privateKeyStr);
}

export async function encryptE2EEMessage(text, recipientPublicKeyStr, senderPublicKeyStr) {
  try {
    if (!recipientPublicKeyStr) return { isEncrypted: false, content: text };

    const recipientJwk = JSON.parse(recipientPublicKeyStr);
    const recipientPubKey = await window.crypto.subtle.importKey(
      'jwk',
      recipientJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );

    // Generate random AES key for message
    const aesKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    // Encrypt payload with AES-GCM
    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encodedText
    );

    // Export AES key and encrypt with recipient RSA public key
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      recipientPubKey,
      rawAesKey
    );

    const payload = {
      cipherText: ab2str(encryptedContentBuffer),
      iv: ab2str(iv),
      encryptedAesKey: ab2str(encryptedAesKeyBuffer),
    };

    return {
      isEncrypted: true,
      encryptedContent: JSON.stringify(payload),
      content: '🔒 Encrypted Message',
    };
  } catch (err) {
    console.error('E2EE Encryption Error:', err);
    return { isEncrypted: false, content: text };
  }
}

export async function decryptE2EEMessage(encryptedPayloadStr, privateKeyStr) {
  try {
    if (!encryptedPayloadStr || !privateKeyStr) return null;

    const payload = JSON.parse(encryptedPayloadStr);
    const privateKeyJwk = JSON.parse(privateKeyStr);

    const privKey = await window.crypto.subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    // Decrypt AES key with RSA private key
    const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privKey,
      str2ab(payload.encryptedAesKey)
    );

    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawAesKeyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt content with AES-GCM key & IV
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(str2ab(payload.iv)) },
      aesKey,
      str2ab(payload.cipherText)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('E2EE Decryption Error:', err.message);
    return '🔒 [Unable to decrypt message]';
  }
}
