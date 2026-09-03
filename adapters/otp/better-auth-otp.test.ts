import { ConfigProvider, Effect, Layer } from "effect";
import {
  generateOTP,
  verifyOTP,
  readOTPSecret,
} from "~/adapters/otp/better-auth-otp";

const testSecret = "JBSWY3DPEHPK3PXP"; // base32, 16 chars
const config = ConfigProvider.fromUnknown({ OTP_SECRET: testSecret });
const configLayer = ConfigProvider.layer(config);

describe("BetterAuth OTP (TOTP via @better-auth/utils)", () => {
  it("secret should be cached", async () => {
    const program = Effect.gen(function* () {
      const s1 = yield* readOTPSecret;
      const s2 = yield* readOTPSecret;
      const s3 = yield* readOTPSecret;
      return [s1, s2, s3] as const;
    });
    const [a, b, c] = await Effect.runPromise(
      Effect.provide(program, configLayer),
    );
    expect(a).toBe(testSecret);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("should generate 6-digit OTP and verify it", async () => {
    const otp = await Effect.runPromise(
      Effect.provide(generateOTP(), configLayer),
    );
    expect(otp).toMatch(/^\d{6}$/);
    const ok = await Effect.runPromise(
      Effect.provide(verifyOTP(otp), configLayer),
    );
    expect(ok).toBe(true);
  });

  it("should fail verify for wrong OTP", async () => {
    const otp = await Effect.runPromise(
      Effect.provide(generateOTP(), configLayer),
    );
    const wrong = otp === "000000" ? "111111" : "000000";
    await expect(
      Effect.runPromise(Effect.provide(verifyOTP(wrong), configLayer)),
    ).rejects.toThrow();
  });

  it("OTP url generation works", async () => {
    // direct API check from @better-auth/utils
    const { createOTP } = await import("@better-auth/utils/otp");
    const url = createOTP(testSecret).url("my-app", "user@example.com");
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("my-app");
  });
});
