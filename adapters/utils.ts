import { isObject } from "effect/Predicate";

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let base64String = "";

  for (let i = 0; i < uint8Array.length; i++) {
    base64String += String.fromCharCode(uint8Array[i]);
  }

  return btoa(base64String);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const byteArray = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }

  return byteArray.buffer;
}

export function safeInt(num: unknown, fallback = 0): number {
  const value = Number.parseInt(num as string);

  return !Object.is(Number.NaN, value) ? value : fallback;
}

const EmptyObject: Record<string, never> = Object.freeze({});

export const safeObj = <T>(
  obj: T,
): T extends Record<string, unknown> ? T : typeof EmptyObject => {
  // @ts-expect-error;
  return isObject(Object, obj) ? obj : EmptyObject;
};
