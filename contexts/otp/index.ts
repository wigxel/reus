import { type Cause, Context, type Effect } from "effect";
import type { ConfigError } from "effect/Config";
import { TaggedError } from "effect/Data";

type PossibleErrors = OTPError | Cause.UnknownError | ConfigError;

export interface OTPInterface {
  generate(): Effect.Effect<string, PossibleErrors, never>;
  verify(otp: string): Effect.Effect<boolean, PossibleErrors, never>;
}

export class OTPService extends Context.Service<OTPService,
  OTPInterface>()("OTPService") {}

export class OTPError extends TaggedError("OTPError") {
  constructor(public message: string) {
    super();
  }
}
