import { Effect } from "effect";
import { ExpectedError } from "~/config/exceptions";
import type { PaymentDetails, TOrderDetails } from "~/migrations/schema";
import { OrderRepoLayer } from "~/repositories/order.repository";

export const getOrders = (
  currentUserId: string,
  column: "userId" | "sellerId",
) => {
  return Effect.gen(function* (_) {
    const orderRepo = yield* OrderRepoLayer.Tag;
    //get the buyer/seller's orders
    const orders = yield* orderRepo.getOrderByUser({ [column]: currentUserId });

    return { data: orders, status: true };
  });
};

export const updateOrder = (
  v: {
    orderId: string;
    currentUserId: string;
    user: "userId" | "sellerId";
  },
  data: Partial<TOrderDetails>,
) => {
  return Effect.gen(function* (_) {
    const orderRepo = yield* OrderRepoLayer.Tag;

    //get the order by id
    const orderDetails = yield* _(
      orderRepo.getSingleOrder({
        id: v.orderId,
        [v.user]: v.currentUserId,
      }),
      Effect.matchEffect({
        onFailure: (e) => new ExpectedError("invalid Order id"),
        onSuccess: (v) => Effect.succeed(v),
      }),
    );

    const paymentDetails = orderDetails.paymentDetails as PaymentDetails;

    if (!(paymentDetails.status === "success")) {
      return yield* new ExpectedError("Payment not yet verified");
    }

    const orders = yield* orderRepo.update(
      {
        orderId: orderDetails.id,
        currentUserId: v.currentUserId,
        user: v.user,
      },
      data,
    );

    return {
      data: orders,
      status: true,
    };
  });
};
