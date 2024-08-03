import { Effect } from "effect";
import { randomUUID } from "uncrypto";
import type { z } from "zod";
import { ExpectedError } from "~/config/exceptions";
import type { authCheckoutSchema, checkoutSchema } from "~/dto/checkout.dto";
import type { Product } from "~/migrations/schema";
import { CartRepoLayer } from "~/repositories/cart.repository";
import { CartItemsRepoLayer } from "~/repositories/cartItems.repository";
import { OrderRepoLayer } from "~/repositories/order.repository";
import { OrderItemsRepoLayer } from "~/repositories/orderItems.repository";

import { PaymentOrderRepoLayer } from "~/repositories/payment-order.repo";
import { PaymentRepoLayer } from "~/repositories/payment.repository";
import { ProductRepoLayer } from "~/repositories/product.repository";
import { UserRepoLayer } from "~/repositories/user.repository";
import {
  CartItemFactory,
  type TcartItems,
  calculateTotalSubprices,
  groupCartItemsBySellerId,
} from "~/utils/cart.util";
import { sendmail } from "./mail.service";
import { createUser } from "./user.service";

/**
 * Add a product to cart
 */
export const addToCart = (data: {
  productId: string;
  currentSessionId: string | undefined;
}) => {
  return Effect.gen(function* (_) {
    const cartRepo = yield* CartRepoLayer.Tag;
    const cartItemRepo = yield* CartItemsRepoLayer.Tag;
    const prodRepo = yield* ProductRepoLayer.Tag;
    const sessionId = data.currentSessionId ?? randomUUID();

    const productDetails = yield* prodRepo.firstOrThrow(data.productId);

    const productExistsAndPublished = productDetails.published === true;

    // make sure the property to add to the cart is published
    if (!productExistsAndPublished) {
      return yield* new ExpectedError(
        "Unable to add product to cart. Product doesn't exists",
      );
    }

    /* Check if there is a cart for the current session id */
    const cart = yield* _(
      cartRepo.getUserCart(sessionId),
      Effect.matchEffect({
        onFailure: () => cartRepo.create({ cartSessionId: sessionId }),
        onSuccess: (v) => Effect.succeed(v),
      }),
    );

    // get product in cart_item
    const inCart = yield* cartItemRepo.getCartProduct({
      productId: data.productId,
      cartId: cart.cartId,
    });

    if (!inCart) {
      // add the product to the cart-items
      yield* cartItemRepo.addProduct({
        cartId: cart.cartId,
        productId: data.productId,
        quantity: 1,
      });
    } else {
      // increment the  cart_item quantity by one
      const currQuantity = ++inCart.quantity;

      yield* cartItemRepo.updateQuantity({
        cartId: cart.cartId,
        productId: data.productId,
        quantity: currQuantity,
      });
    }

    return {
      status: true,
      sessionId,
    };
  });
};

export const removeFromCart = (data: {
  productId: string;
  currentSessionId: string;
}) => {
  return Effect.gen(function* (_) {
    const cartRepo = yield* CartRepoLayer.Tag;
    const cartItemRepo = yield* CartItemsRepoLayer.Tag;

    /* If currentSessionId is undefined cancel delete operation */
    if (!data.currentSessionId) {
      return yield* new ExpectedError(
        "Invalid cart session: Unable to delete item from cart",
      );
    }

    /* Check if there is a cart for the current session id */
    const cart = yield* _(
      cartRepo.getUserCart(data.currentSessionId),
      Effect.mapError(() => new ExpectedError("Invalid cart session id")),
    );

    // get product in cart_item
    const inCart = yield* cartItemRepo.getCartProduct({
      productId: data.productId,
      cartId: cart.cartId,
    });

    if (!inCart) {
      return yield* new ExpectedError("Unable to delete: product not in cart");
    }

    // delete the product from cart
    yield* cartItemRepo.deleteCartItem(cart.cartId, data.productId);

    return {
      status: true,
    };
  });
};

export const getAllCartItems = (data: {
  currentSessionId: string | undefined;
}) => {
  return Effect.gen(function* (_) {
    const cartRepo = yield* CartRepoLayer.Tag;
    const cartItemRepo = yield* CartItemsRepoLayer.Tag;

    /* If currentSessionId is undefined cancel delete operation */
    if (data.currentSessionId === undefined) {
      return {
        data: {
          cartItems: [],
          subTotalPrice: 0,
          total: 0,
        },
        status: true,
      };
    }

    /* Check if there is a cart for the current session id */
    const cart = yield* _(
      cartRepo.getUserCart(data.currentSessionId),
      Effect.mapError(
        () => new ExpectedError("Invalid cart id: Add new items to cart"),
      ),
    );

    // get and return allCartItems
    const cartItems = yield* cartItemRepo.getCartItems(cart.cartId);

    // calculate all total & sub prices
    const modCartItems = calculateTotalSubprices(
      cartItems.map(CartItemFactory),
    );

    return {
      data: {
        cartItems: modCartItems.newCartItems,
        subTotalPrice: modCartItems.subPrice,
        total: modCartItems.subPrice,
      },
      status: true,
    };
  });
};

export const deleteCart = (data: {
  currentSessionId: string;
}) => {
  return Effect.gen(function* (_) {
    const cartRepo = yield* CartRepoLayer.Tag;

    /* If currentSessionId is undefined cancel delete operation */
    if (!data.currentSessionId) {
      return yield* new ExpectedError(
        "Failed to empty cart: Invalid cart session",
      );
    }

    /* Check if there is a cart for the current session id */
    const cart = yield* _(
      cartRepo.getUserCart(data.currentSessionId),
      Effect.mapError(() => new ExpectedError("Invalid cart session id")),
    );

    yield* cartRepo.delete(cart.cartSessionId);

    return { data: [], status: true };
  });
};

export const updateCartQuantity = (data: {
  quantity: number;
  productId: string;
  currentSessionId: string;
}) => {
  return Effect.gen(function* (_) {
    const cartRepo = yield* CartRepoLayer.Tag;
    const cartItemRepo = yield* CartItemsRepoLayer.Tag;

    if (data.quantity < 1) {
      yield* new ExpectedError("Minimum of 1 quantity required");
    }

    /* Check if there is a cart for the current session id */
    const cart = yield* _(
      cartRepo.getUserCart(data.currentSessionId),
      Effect.mapError(() => new ExpectedError("Cart not found")),
    );

    // get product in cart_item
    const inCart = yield* cartItemRepo.getCartProduct({
      productId: data.productId,
      cartId: cart.cartId,
    });

    if (!inCart) {
      // create a cart with the sessionId
      return yield* new ExpectedError("Product not in cart");
    }

    yield* cartItemRepo.updateQuantity({
      cartId: cart.cartId,
      productId: data.productId,
      quantity: data.quantity,
    });

    return {
      status: true,
    };
  });
};

export const checkout = (
  currentUserId: string | undefined,
  cartSessionId: string | undefined,
) => {
  return Effect.gen(function* (_) {
    const cartRepo = yield* CartRepoLayer.Tag;
    const cartItemsRepo = yield* CartItemsRepoLayer.Tag;
    const userRepo = yield* UserRepoLayer.Tag;

    const authenticated = !!currentUserId;

    const userDetails = currentUserId
      ? yield* userRepo.getUserById(currentUserId)
      : null;

    const cart = yield* _(
      cartRepo.getUserCart(cartSessionId),
      Effect.mapError(
        () => new ExpectedError("No available cart for the session"),
      ),
    );

    const cartItems = yield* _(
      cartItemsRepo.getCartItems(cart.cartId),
      Effect.mapError(() => new ExpectedError("No available cart items")),
    );

    // calculate all total & sub prices
    const modCartItems = calculateTotalSubprices(
      cartItems.map(CartItemFactory),
    );

    return {
      authenticated,
      userDetails,
      data: {
        cartItems: modCartItems.newCartItems,
        subTotal: modCartItems.subPrice,
        total: modCartItems.subPrice,
      },
    };
  });
};

export const processCheckout = (
  currentUserId: string,
  cartSessionId: string,
  data: z.infer<typeof authCheckoutSchema> & z.infer<typeof checkoutSchema>,
) => {
  return Effect.gen(function* (_) {
    const userRepo = yield* UserRepoLayer.Tag;
    const cartRepo = yield* CartRepoLayer.Tag;
    const cartItemsRepo = yield* CartItemsRepoLayer.Tag;
    const paymentRepo = yield* PaymentRepoLayer.Tag;
    const orderRepo = yield* OrderRepoLayer.Tag;
    const orderItemsRepo = yield* OrderItemsRepoLayer.Tag;
    const paymentOrderRepo = yield* PaymentOrderRepoLayer.Tag;

    //if cartSessionId is undefined
    if (!cartSessionId) {
      return yield* new ExpectedError(
        "Invalid cartSessionId: cannot proceed with checkout",
      );
    }

    const createNewUser = _(
      createUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: "BUYER",
        address: data.address,
        phone: data.phone,
        state: data.state,
        country: data.country,
      }),
      Effect.map((e) => e.user),
    );

    // if not logged in create new account for the user
    const user = !currentUserId
      ? yield* createNewUser
      : yield* _(
          userRepo
            .getUserById(currentUserId)
            .pipe(
              Effect.mapError(
                () => new ExpectedError("invalid user: user does not exit "),
              ),
            ),
        );

    // get the cart id
    const cart = yield* _(
      cartRepo.getUserCart(cartSessionId),
      Effect.mapError(
        () =>
          new ExpectedError(
            "invalid cartSession: cannot proceed with checkout",
          ),
      ),
    );

    // get all cart items
    const cartItems = yield* cartItemsRepo.getCartItems(cart.cartId);

    if (!cartItems.length) {
      return yield* new ExpectedError(
        "Cart is empty cannot proceed with checkout",
      );
    }

    const cartItemsBySeller: Record<string, TcartItems[]> =
      groupCartItemsBySellerId(cartItems as TcartItems[]);

    // create payment
    const payment = yield* paymentRepo.create({
      amount: String(data.payment.amount),
      paymentType: data.payment.paymentType,
      status: data.payment.paymentStatus,
    });

    // create the orderDetails
    for (const sellerId in cartItemsBySeller) {
      let totalPrice = 0;
      //calculate the total price for cart items
      for (const item of cartItemsBySeller[sellerId]) {
        const product = item.productDetails as Product;
        totalPrice += Number(product.price) * Number(item.quantity);
      }

      const orderDetails = yield* orderRepo.create({
        //id of the user buying
        userId: user.id,
        sellerId,
        total: String(totalPrice),
        deliveryType: data.deliveryType,
        status: "pending",
        paymentId: payment.paymentId,
      });

      //keeps track of orders linked to a payment
      yield* paymentOrderRepo.create({
        paymentId: payment.paymentId,
        orderId: orderDetails.id,
      });

      //add products to order items
      for (const item of cartItemsBySeller[sellerId]) {
        yield* orderItemsRepo.create({
          orderId: orderDetails.id,
          productId: item.productId,
          quantity: item.quantity,
        });
      }
    }

    //delete the cart
    yield* cartRepo.delete(cartSessionId);

    //send email
    yield* sendmail({
      to: user.email,
      subject: "Sucessful checkout",
      text: "Congratulation! your checkout process was successful",
    });

    return { status: true };
  });
};
