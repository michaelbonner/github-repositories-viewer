import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

export const decrypt = (encryptedText: string) => {
  if (!encryptedText) return "";

  var bytes = AES.decrypt(
    encryptedText,
    process.env.NEXT_PUBLIC_ENCRYPTION_KEY || ""
  );
  return JSON.parse(bytes.toString(enc));
};
