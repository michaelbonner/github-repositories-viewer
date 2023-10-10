import { test } from "vitest";
import { decrypt } from "./decrypt";
import { encrypt } from "./encrypt";

test("decrypt - should decrypt the encrypted text", () => {
  const plainText = "hello world";
  const encryptedText = encrypt(plainText);
  const decryptedText = decrypt(encryptedText);
  if (decryptedText !== plainText) {
    throw new Error("Decryption failed");
  }
});

test("decrypt - should return an empty string if encrypted text is not provided", () => {
  const decryptedText = decrypt("");
  if (decryptedText !== "") {
    throw new Error("Decryption failed");
  }
});

test("decrypt - should return an empty string if decryption fails", () => {
  const decryptedText = decrypt("invalid-encrypted-text");
  if (decryptedText !== "") {
    throw new Error("Decryption failed");
  }
});
