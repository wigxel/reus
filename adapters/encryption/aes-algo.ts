import { Config, Effect, Layer, pipe } from "effect";
import crypto from "uncrypto";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~/adapters/utils";
import { HashingError, ReversibleHash } from "~/layers/encryption/reversible";

export class AESAlgo {
  private readonly key: CryptoKey;
  private readonly iv: ArrayBuffer;
  private static readonly algorithm = {
    name: "AES-GCM",
    length: 128,
  } as const;

  /**
   * Constructor that takes a CryptoKey and IV (Initialization Vector) for the encryption
   */
  constructor(cryptoKey: CryptoKey, iv: ArrayBuffer) {
    this.key = cryptoKey;
    this.iv = iv; // Initialisation Vector (IV)
  }

  static generateIV() {
    const _12bytes = new Uint8Array(12);
    return crypto.getRandomValues(_12bytes);
  }

  static importKey(jwk: JsonWebKey) {
    return crypto.subtle.importKey("jwk", jwk, AESAlgo.algorithm, false, [
      "decrypt",
    ]);
  }

  static async exportKey(cryptoKey: CryptoKey) {
    return await crypto.subtle.exportKey("jwk", cryptoKey);
  }

  static async generateKey() {
    return await crypto.subtle.generateKey(AESAlgo.algorithm, true, [
      "decrypt",
      "encrypt",
    ]);
  }

  /**
   * Encrypts a given message using AES-128-GCM encryption algorithm. The message is broken into chunks and each chunk
   * is encrypted separately before being concatenated together to form the final encrypted string.
   */
  async encrypt(_message: string): Promise<ArrayBuffer> {
    // Set the plaintext message to encrypt
    const encodedMessage = new TextEncoder().encode(_message);

    // Encrypt message with IV and algorithm
    return await crypto.subtle.encrypt(
      { name: AESAlgo.algorithm.name, iv: this.iv },
      this.key,
      encodedMessage,
    );
  }

  /**
   * Decrypts an encrypted message using AES-128-GCM decryption algorithm. The decryption process is the reverse of
   * the encryption process, where each chunk of the ciphertext is decrypted separately before being concatenated
   * together to form the original plaintext message.
   */
  async decrypt(content: ArrayBuffer): Promise<string> {
    const buffer = await crypto.subtle.decrypt(
      { name: AESAlgo.algorithm.name, iv: this.iv },
      this.key,
      content,
    );

    return new TextDecoder().decode(buffer);
  }
}

export function createReversibleHash() {
  const getCryptoKey = (jwk: JsonWebKey) =>
    Effect.tryPromise({
      try: () => AESAlgo.importKey(jwk),
      catch: () => new HashingError("Error importing Crypto Key"),
    });

  const convertIV = (iv: string) =>
    Effect.try({
      try: () => base64ToArrayBuffer(iv),
      catch: () => new HashingError("Error convert IV"),
    });

  const reversible = Effect.gen(function* (_) {
    const jwk = yield* Config.string("ENCRYPTION_JWK").pipe(
      Effect.flatMap((str) => JSON.parse(str)),
      Effect.map((e) => e as JsonWebKey),
    );
    const iv_string = yield* Config.string("ENCRYPTION_IV");

    const iv = yield* convertIV(iv_string);
    const cryptoKey = yield* getCryptoKey(jwk);
    const hash = new AESAlgo(cryptoKey, iv);

    return {
      encrypt: (value: string) =>
        pipe(
          Effect.tryPromise(() => hash.encrypt(value)),
          Effect.map((buffer) => arrayBufferToBase64(buffer)),
          Effect.mapError(() => new HashingError("Error encrypting content")),
        ),
      decrypt: (value: string) =>
        pipe(
          Effect.tryPromise(() => hash.decrypt(base64ToArrayBuffer(value))),
          Effect.mapError(() => new HashingError("Error decrypting content")),
        ),
    };
  });

  return Layer.effect(ReversibleHash, reversible);
}

export async function generateSecrets() {
  const crypto = await AESAlgo.generateKey();
  const iv = AESAlgo.generateIV();

  return {
    ENCRYPTION_JWK: await AESAlgo.exportKey(crypto),
    ENCRYPTION_IV: iv,
  };
}
