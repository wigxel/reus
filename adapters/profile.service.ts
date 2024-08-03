import { Effect } from "effect";
import type { User } from "~/migrations/schema";
import { UserRepo, UserRepoLayer } from "~/repositories/user.repository";
import { uploadToCloudinary } from "./file-upload.service";

export const getProfile = (userId: string) => {
  return Effect.gen(function* () {
    const userRepo = yield* UserRepoLayer.Tag;

    return yield* userRepo.findFirst({ id: userId });
  });
};

export const editProfile = (userId: string, profileUpdate: Partial<User>) => {
  return Effect.gen(function* () {
    const userRepo = yield* UserRepoLayer.Tag;
    return yield* userRepo.update(userId, profileUpdate);
  });
};

export const uploadImage = (
  userId: string,
  image: { data: Buffer; filename: string },
) => {
  return Effect.gen(function* () {
    const userRepo = yield* UserRepo;
    // Convert buffer to base64 data URI
    const base64Image = `data:image/jpeg;base64,${image.data.toString(
      "base64",
    )}`;
    const responseUrl = yield* uploadToCloudinary(base64Image);
    yield* userRepo.update(userId, { profilePicture: responseUrl.secure_url });
    return responseUrl;
  });
};
