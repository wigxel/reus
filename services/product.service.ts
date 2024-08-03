import { Effect } from "effect";
import type { z } from "zod";
import { ExpectedError, PermissionError } from "~/config/exceptions";
import type {
  TProductStatusToggle,
  createProductDto,
  productSearchDto,
} from "~/dto/product.dto";
import type { Product, ProductLocation } from "~/migrations/schema";
import { CategoryRepo } from "~/repositories/category.repo";
import { ProductLocationRepoLayer } from "~/repositories/location.repository";
import { ProductRepoLayer } from "~/repositories/product.repository";
import { ProductImageRepoLayer } from "~/repositories/productImage.repository";
import { PaginationService } from "./pagination.service";

export const createProduct = (
  input: z.infer<typeof createProductDto> & { ownerId: string },
) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;
    const categoryRepo = yield* CategoryRepo;
    const productLocationRepo = yield* _(ProductLocationRepoLayer.Tag);

    yield* _(categoryRepo.firstOrThrow(input.categoryId));

    const productData: Product = {
      ownerId: input.ownerId,
      name: input.name,
      categoryId: input.categoryId,
      description: input.description,
      price: String(input.price),
    };
    //add product to the table
    const prodResult = yield* prodRepo.create(productData);
    //insert location
    const locationData: ProductLocation = {
      placeId: input.location.placeId,
      productId: prodResult.id,
      street: input.location.street,
      city: input.location.city,
      state: input.location.state,
      latitude: String(input.location.latitude),
      longitude: String(input.location.longitude),
    };

    yield* _(productLocationRepo.create(locationData));

    return {
      status: true,
    };
  });
};

export const getProducts = (currentUserId: string = null) => {
  return Effect.gen(function* (_) {
    const paginate = yield* PaginationService;
    const prodRepo = yield* ProductRepoLayer.Tag;
    //get all products count
    const total_product = yield* prodRepo.getTotalCount(currentUserId);

    const products = yield* prodRepo.getProducts(paginate.query, currentUserId);

    return {
      data: products,
      meta: { ...paginate.meta, total: total_product },
    };
  });
};

export const getProductDetails = (
  productId: string,
  currentUserId: string = null,
) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;

    const productDetails = yield* prodRepo.firstOrThrow(
      productId,
      currentUserId,
    );

    return {
      data: productDetails,
      status: true,
    };
  });
};

export const editProduct = (
  currentId: string,
  productId: string,
  data: Partial<Product>,
) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;

    yield* prodRepo.firstOrThrow(productId, currentId);

    yield* prodRepo.update(currentId, productId, data);

    return {
      status: true,
    };
  });
};

export const uploadProductImage = (data: {
  productId: string;
  imageUrl: string | string[];
  currentUserId: string;
}) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;
    const prodImageRepo = yield* ProductImageRepoLayer.Tag;

    yield* prodRepo.firstOrThrow(data.productId, data.currentUserId);

    if (Array.isArray(data.imageUrl)) {
      for (const imageUrl of data.imageUrl) {
        yield* prodImageRepo.create({
          productId: data.productId,
          imageUrl: imageUrl,
        });
      }
    } else {
      yield* prodImageRepo.create({
        productId: data.productId,
        imageUrl: data.imageUrl,
      });
    }

    return { status: "Image uploaded successfully" };
  });
};

export const deleteProductImage = (data: {
  productId: string;
  imageId: number | number[];
  currentUserId: string;
}) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;
    const prodImageRepo = yield* ProductImageRepoLayer.Tag;

    yield* prodRepo.firstOrThrow(data.productId, data.currentUserId);

    if (Array.isArray(data.imageId)) {
      for (const imageId of data.imageId) {
        yield* prodImageRepo.delete({
          productId: data.productId,
          imageId: String(imageId),
        });
      }
    } else {
      yield* prodImageRepo.delete({
        productId: data.productId,
        imageId: String(data.imageId),
      });
    }

    return { status: true };
  });
};

export const deleteProduct = (data: {
  productId: string;
  currentUserId: string;
}) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;

    yield* prodRepo.firstOrThrow(data.productId, data.currentUserId);

    yield* prodRepo.update(data.currentUserId, data.productId, {
      deletedAt: new Date(),
    });

    return { status: true };
  });
};

export const searchProduct = (
  data: z.infer<typeof productSearchDto>,
  currentUserId: string = null,
) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* ProductRepoLayer.Tag;
    const paginate = yield* PaginationService;

    const prodResult = yield* prodRepo.searchByQuery(
      paginate.query,
      data,
      currentUserId,
    );

    return {
      data: prodResult.results,
      meta: { ...paginate.meta, total: prodResult.total },
    };
  });
};

export const productStatusToggle = (
  productId: string,
  toggleType: TProductStatusToggle,
  currentUserId: string = null,
) => {
  return Effect.gen(function* (_) {
    const prodRepo = yield* _(ProductRepoLayer.Tag);

    const productDetails = yield* _(prodRepo.getProductById(productId)).pipe(
      Effect.mapError(
        (e) => new Error(`Unable to update product ${toggleType} status`),
      ),
    );

    if (!(productDetails.ownerId === currentUserId)) {
      return yield* new ExpectedError(`Unable to update ${toggleType} status`);
    }

    //current toggleType state
    const state = productDetails[toggleType];

    const updateData = { [toggleType]: !state };

    //toggle the state on save
    const updateResult = yield* _(
      prodRepo.update(currentUserId, productId, updateData),
    );

    return {
      data: { [toggleType]: updateResult[toggleType] },
      status: true,
    };
  });
};
