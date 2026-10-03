import { bytesToHex } from "@open-graphene/primitives";
export function displayJson(value: unknown): string {
  return JSON.stringify(
    value,
    (_, item) => {
      if (typeof item === "bigint") return item.toString();
      if (item instanceof Uint8Array) return bytesToHex(item);
      return item;
    },
    2,
  );
}
