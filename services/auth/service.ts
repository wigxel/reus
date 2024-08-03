import { Effect, Layer, pipe } from "effect";
import { getAdminByEmailQuery } from "~/app/repository/admin.repo";
import { findUserQuery } from "~/app/repository/user.repo";
import { notNil, tryQuery } from "~/utils/query.helpers";
import { AuthUserCtx } from "./ctx";

const CustomerLive = Layer.succeed(
  AuthUserCtx,
  AuthUserCtx.of({
    getUserRecord: ({ email }) => {
      return Effect.suspend(() =>
        Effect.gen(function* (_) {
          yield* _(Effect.logDebug("CustomerAuth: Getting user record"));
          const user = yield* _(
            pipe(
              tryQuery(() => findUserQuery({ where: { email } })),
              Effect.flatMap(notNil),
            ),
          );
          yield* _(
            Effect.logDebug(`CustomerAuth: Sending user record ${user.id}`),
          );
          return { user_id: String(user.id), password: user.password ?? "" };
        }),
      );
    },
  }),
);
const TeamMemberAuth = Layer.succeed(
  AuthUserCtx,
  AuthUserCtx.of({
    getUserRecord: ({ email }) => {
      return Effect.gen(function* (_) {
        yield* _(Effect.logDebug("TeamMemberAuth: Getting user record"));
        const user = yield* _(
          tryQuery(() => getAdminByEmailQuery(email)).pipe(
            Effect.flatMap(notNil),
          ),
        );

        yield* _(
          Effect.logDebug(`TeamMemberAuth: Sending user record ${user.id}`),
        );

        return { user_id: user.id, password: user.password };
      });
    },
  }),
);

export const AuthLayer = {
  Tag: AuthUserCtx,
  Customer: {
    Live: CustomerLive,
  },
  TeamMember: {
    Live: TeamMemberAuth,
  },
};
