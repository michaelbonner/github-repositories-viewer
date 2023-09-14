import AES from "crypto-js/aes";

export const encrypt = (plainText: string) => {
  if (!plainText) return "";

  return AES.encrypt(
    JSON.stringify(plainText),
    process.env.NEXT_PUBLIC_ENCRYPTION_KEY || ""
  ).toString();
};
