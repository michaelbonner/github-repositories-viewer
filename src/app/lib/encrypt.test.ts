import { test } from "vitest";
import { encrypt } from "./encrypt";

test("encrypt - should encrypt the plain text", () => {
  const plainText = "hello world";
  const encryptedText = encrypt(plainText);
  if (encryptedText === plainText) {
    throw new Error("Encryption failed");
  }
});

test("encrypt - should return an empty string if plain text is not provided", () => {
  const encryptedText = encrypt("");
  if (encryptedText !== "") {
    throw new Error("Encryption failed");
  }
});
