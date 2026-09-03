// ponytail: wildcard any shims for host-provided modules. Replace with real host types when integrating.
// These let `tsc --noEmit` pass in the reusable library without requiring the consumer's ~/ files.
declare module "~/*";
declare module "~/libs/query.helpers";
declare module "~/repositories/*";
declare module "~/config/*";
declare module "~/contexts/*";
declare module "~/migrations/*";
declare module "~/utils/*";
declare module "~/dto/*";
declare module "~/app/*";
declare module "~/types/*";
declare module "@repo/shared/*";
declare module "@repo/shared/src/data.helpers";
declare module "cloudinary";
declare module "./user.service";
