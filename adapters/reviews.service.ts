import { Effect } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { ExpectedError, PermissionError } from "~/config/exceptions";
import type {
  Comment,
  NewComments,
  NewReview,
  Review,
} from "~/migrations/schema";
import { CommentRepo } from "~/repositories/comment.repository";
import { ProductRepo } from "~/repositories/product.repository";
import { ReviewRepo } from "~/repositories/review.repository";

export function readReviews(filters: Partial<Review> = {}) {
  return Effect.gen(function* (_) {
    const reviewRepo = yield* ReviewRepo;
    return yield* reviewRepo.findProductReviews(filters);
  });
}

export function createReview(data: NewReview) {
  return Effect.gen(function* (_) {
    const reviewRepo = yield* ReviewRepo;
    const productRepo = yield* ProductRepo;
    const response = yield* reviewRepo.create(data);

    if (typeof response === "undefined") {
      yield* new ExpectedError("Already reviewed product");
    }

    const product = yield* productRepo.findFirst(data.productId);
    yield* productRepo.update(product.ownerId, product.id, {
      rating:
        Number(product.rating) > 0
          ? ((Number(product.rating) + data.rating) / 2).toString()
          : data.rating.toString(), // get average
    });

    return response;
  });
}

export function updateReview(
  reviewId: string,
  userId: string,
  data: Partial<Omit<Review, "id">>,
) {
  return Effect.gen(function* (_) {
    const reviewRepo = yield* ReviewRepo;
    const review = yield* reviewRepo.findOne(reviewId);
    if (!review) yield* new NoSuchElementException("Review does not exist");
    if (review.userId !== userId)
      return yield* new PermissionError(
        "You are not authorized to make this request",
      );
    return yield* reviewRepo.update(reviewId, data);
  });
}

export function deleteReview(reviewId: string, userId: string) {
  return Effect.gen(function* (_) {
    const reviewRepo = yield* ReviewRepo;
    const review = yield* reviewRepo.findOne(reviewId);
    if (!review) yield* new NoSuchElementException("Review does not exist");
    if (review.userId !== userId)
      return yield* new PermissionError(
        "You are not authorized to make this request",
      );
    return yield* reviewRepo.deleteOne(reviewId);
  });
}

export function readComments(data: Partial<Comment>) {
  return Effect.gen(function* (_) {
    const commentRepo = yield* CommentRepo;
    return yield* commentRepo.findComments(data);
  });
}

export function createComment(data: NewComments) {
  return Effect.gen(function* (_) {
    const commentRepo = yield* CommentRepo;
    return yield* commentRepo.create(data);
  });
}

export function updateComment(
  commentId: string,
  userId: string,
  data: Partial<Omit<Comment, "id">>,
) {
  return Effect.gen(function* (_) {
    const commentRepo = yield* CommentRepo;
    const comment = yield* commentRepo.findOne(commentId);

    if (!comment) {
      yield* new NoSuchElementException("Comment doesn't exist");
    }

    if (comment.userId !== userId) {
      yield* new PermissionError("Not authorized to perform this action");
    }

    return yield* commentRepo.update(commentId, data);
  });
}

export function deleteComment(commentId: string, userId: string) {
  return Effect.gen(function* (_) {
    const commentRepo = yield* CommentRepo;
    const comment = yield* commentRepo.findOne(commentId);

    if (!comment) {
      return yield* new ExpectedError("Comment doesn't exist");
    }

    if (comment.userId !== userId) {
      return yield* new ExpectedError("Not authorized to perform this action");
    }
    return yield* commentRepo.deleteOne(commentId);
  });
}
