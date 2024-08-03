import { ConfigProvider, Effect, Layer } from "effect";
import { createReversibleHash } from "~/adapters/encryption/reversible-hasher";
import { TimeBasedToken } from "~/adapters/encryption/time-based";

describe("Time based token", () => {
  it("should add reversible time-based token", () => {
    const SALT = "hello";
    const IV_HEX = "c28d1b0086ac1d7c82d57ac22d5abbaf";

    const deps = Layer.merge(
      createReversibleHash({ hex: "", salt: "" }),
      Layer.setConfigProvider(
        ConfigProvider.fromJson({
          HASHING_MAILING_SALT: SALT,
          HASHING_IV_HEX: IV_HEX,
        }),
      ),
    );

    const effect = TimeBasedToken.encrypt(
      { name: "Frank moore" },
      new Date(2024, 6, 26),
    );

    const token = Effect.runSync(Effect.provide(effect, deps));

    // Usage as a token for email links
    // `https://localhost:3000/customer/events?userId=12&token=${token}`
    //
    expect(typeof token === "string").toBe(true);
  });
});
