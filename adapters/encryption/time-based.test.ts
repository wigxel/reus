import { ConfigProvider, Effect, Layer } from "effect";
import { createReversibleHash } from "~/adapters/encryption/aes-algo";
import { TimeBasedToken } from "~/adapters/encryption/time-based";

const config = ConfigProvider.fromJson({
  ENCRYPTION_JWK: `{"key_ops":["decrypt","encrypt"],"ext":true,"kty":"oct","k":"swnbYyH2_3LohW0Bro4Ytg","alg":"A128GCM"}`,
  ENCRYPTION_IV: "41,129,192,219,14,151,82,23,218,152,92,218",
});

describe("Time based token", () => {
  it("should add reversible time-based token", async () => {
    const deps = Layer.empty.pipe(
      Layer.provideMerge(createReversibleHash),
      Layer.provideMerge(Layer.setConfigProvider(config)),
    );

    const effect = TimeBasedToken.encrypt(
      { name: "Frank moore" },
      new Date(2024, 6, 26),
    );

    const token = Effect.runPromise(Effect.provide(effect, deps));

    // Usage as a token for email links
    // `https://localhost:3000/customer/events?userId=12&token=${token}`
    expect(token).resolves.toMatchInlineSnapshot(
      `"n3hgQCfJs6o9Vam9RKv1dqNckPDNJkStkJjNNLPIJstpkqi2hG97/nI8o1n3duvOWpCcBKQ2V3fBMCyNyW8MofGzAW7EGA4="`,
    );
  });
});
