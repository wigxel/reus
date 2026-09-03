import { Effect } from "effect";
import { Argon2dHasherLive } from "~/adapters/encryption/argon2d";
import { hashPassword, verifyPassword } from "~/contexts/encryption/helpers";

describe("Argon2d PasswordHasher (scrypt via @better-auth/utils)", () => {
  it("should hash and verify same password", async () => {
    const result = await Effect.runPromise(
      Effect.provide(
        hashPassword("some_user_password").pipe(
          Effect.flatMap((h) => verifyPassword("some_user_password", h)),
        ),
        Argon2dHasherLive,
      ),
    );
    expect(result).toBe("Password verification successful");
  });

  it("should fail verify for wrong password", async () => {
    await expect(
      Effect.runPromise(
        Effect.provide(
          hashPassword("some_user_password").pipe(
            Effect.flatMap((h) => verifyPassword("wrong_password", h)),
          ),
          Argon2dHasherLive,
        ),
      ),
    ).rejects.toThrow();
  });

  it("hash should be salted (different hashes for same password)", async () => {
    const [h1, h2] = await Effect.runPromise(
      Effect.provide(
        Effect.all([hashPassword("same"), hashPassword("same")]),
        Argon2dHasherLive,
      ),
    );
    expect(h1).not.toBe(h2);
    const ok1 = await Effect.runPromise(
      Effect.provide(verifyPassword("same", h1), Argon2dHasherLive),
    );
    const ok2 = await Effect.runPromise(
      Effect.provide(verifyPassword("same", h2), Argon2dHasherLive),
    );
    expect(ok1).toBe("Password verification successful");
    expect(ok2).toBe("Password verification successful");
  });
});
