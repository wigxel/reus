import { AESAlgo } from "./aes-algo";

// it.skip("should decipher", () => {
//   const SALT = "hello";
//   const IV_HEX = "c28d1b0086ac1d7c82d57ac22d5abbaf";
//
//   const instance_lgo = new AESAlgo("hello", IV_HEX);
//   const algo = new AESAlgo("hello", IV_HEX);
//
//   const encrypted_string = algo.encrypt("Frank moore");
//   const decrypted_value = instance_lgo.decrypt(encrypted_string);
//
//   expect(decrypted_value).toMatchInlineSnapshot(`"Frank moore"`);
// });

it("should generate key", async () => {
  const iv = AESAlgo.generateIV();
  const cryptoKey = await AESAlgo.generateKey();
  const reversible = new AESAlgo(cryptoKey, iv);

  const message = "Hello World";
  const encrypted = await reversible.encrypt(message);
  const a = await reversible.decrypt(encrypted);

  expect(a).toBe(message);
});

it("should fail if key is compromised", async () => {
  const cryptoKey = await AESAlgo.generateKey();
  const iv = AESAlgo.generateIV();
  const reversible = new AESAlgo(cryptoKey, iv);

  const message = "Hello World";
  const encrypted = await reversible.encrypt(message);
  const comprisedBuffer = encrypted.slice(1, 122);
  const decrypted_data = reversible.decrypt(comprisedBuffer);

  expect(decrypted_data).rejects.toMatchInlineSnapshot(
    `[OperationError: The operation failed for an operation-specific reason]`,
  );
});
