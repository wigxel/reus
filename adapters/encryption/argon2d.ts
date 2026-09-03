import { Effect, Layer, pipe } from "effect";
import { hashPassword as betterHash, verifyPassword as betterVerify } from "@better-auth/utils/password";
import { PasswordHasher, PasswordHasherError } from "~/layers/encryption/password-hasher";

function hashPassword(password: string) {
  return Effect.promise(() => betterHash(password));
}

function verifyPassword(password: string, hash: string) {
  return pipe(
    Effect.tryPromise({
      try: () => betterVerify(hash, password),
      catch: (err) => new PasswordHasherError(String(err)),
    }),
  );
}

export const Argon2dPasswordHasher = {
  name: "Argon2d",
  hash: hashPassword,
  verify: verifyPassword,
};

export const Argon2dHasherLive = Layer.succeed(
  PasswordHasher,
  Argon2dPasswordHasher,
);
