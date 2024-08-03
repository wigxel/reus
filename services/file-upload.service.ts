import cloudinary from "cloudinary";
import { Config, Effect } from "effect";

export const uploadToCloudinary = (data: string) => {
  return Effect.gen(function* () {
    const conf = yield* Effect.gen(function* () {
      const canUploadImage = yield* Config.boolean("ENABLE_IMAGE_UPLOAD");
      const cloudinarySecretKey = yield* Config.string("CLOUDINARY_SECRET_KEY");
      const cloudinaryApiKey = yield* Config.string("CLOUDINARY_API_KEY");
      const cloudinaryCloudName = yield* Config.string("CLOUDINARY_CLOUD_NAME");
      const cloudinaryFolder = yield* Config.string("CLOUDINARY_FOLDER");
      const env = yield* Config.string("NODE_ENV");
      return {
        cloudinarySecretKey,
        cloudinaryApiKey,
        cloudinaryCloudName,
        cloudinaryFolder,
        canUploadImage,
        isDev: env !== "production",
      };
    });

    if (!conf.canUploadImage) {
      const response = yield* Effect.succeed("Skipping upload");
      return {
        secure_url: response,
      };
    }

    cloudinary.v2.config({
      cloud_name: conf.cloudinaryCloudName,
      api_key: conf.cloudinaryApiKey,
      api_secret: conf.cloudinarySecretKey,
      secure: !conf.isDev,
      sign_url: false,
    });

    const res = yield* Effect.tryPromise({
      try: () =>
        cloudinary.v2.uploader.upload(data, {
          resource_type: "auto",
          folder: conf.cloudinaryFolder,
        }),
      catch: (error) => {
        console.log(error);
        return null;
      },
    });
    return res;
  });
};
