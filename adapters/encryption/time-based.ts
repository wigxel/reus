import { fromUnixTime, getUnixTime, isPast } from "date-fns";
import { Effect, type Record } from "effect";
import { z } from "zod";
import { HashingError, ReversibleHash } from "~/layers/encryption/reversible";

function createTimeBasedEncryption(
  data: Record<string, unknown>,
  expires_at: Date,
) {
  return Effect.gen(function* () {
    const cipher = yield* ReversibleHash;

    const content = JSON.stringify({
      data,
      expires_at: getUnixTime(expires_at),
    });

    return yield* cipher.encrypt(content);
  });
}

function decryptTimeBasedEncryption(encrypted_string: string) {
  return Effect.gen(function* () {
    const decipher = yield* ReversibleHash;
    const value = yield* decipher.decrypt(encrypted_string);

    const data = yield* Effect.try({
      try() {
        const d = JSON.parse(value) as unknown as Record<string, unknown>;
        return TokenData.parse(d);
      },
      catch() {
        return new Error("Error deserializing encrypted data");
      },
    });

    if ("expires_at" in data) {
      if (!isPast(fromUnixTime(data.expires_at))) {
        return data.data;
      }
    }

    yield* Effect.fail(new HashingError("Token expired"));
  });
}

const TokenData = z.object({
  data: z.any(),
  expires_at: z.number({ coerce: true }),
});

export const TimeBasedToken = Object.freeze({
  encrypt: createTimeBasedEncryption,
  decrypt: decryptTimeBasedEncryption,
});
