import { type Cause, type ConfigError, Context, type Effect } from "effect";
import { TaggedError } from "effect/Data";

type PossibleErrors =
  | OTPError
  | Cause.UnknownException
  | ConfigError.ConfigError;

export interface OTPInterface {
  generate(): Effect.Effect<string, PossibleErrors, never>;
  verify(otp: string): Effect.Effect<boolean, PossibleErrors, never>;
}

export class OTPService extends Context.Tag("OTPService")<
  OTPService,
  OTPInterface
>() {}

export class OTPError extends TaggedError("OTPError") {
  constructor(public message: string) {
    super();
  }
}
