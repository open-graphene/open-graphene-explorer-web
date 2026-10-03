import { formatRawAmount } from "@open-graphene/core";

export function formatAssetAmount(raw: bigint, precision: number): string {
  const [whole, fraction] = formatRawAmount(raw, precision).split(".");
  const grouped = new Intl.NumberFormat("en-US").format(BigInt(whole));
  const significant = fraction?.replace(/0+$/, "");
  return significant ? `${grouped}.${significant}` : grouped;
}

export function formatIndexedAmount(raw: number, precision: number): string {
  // The indexer's simple list represents int64 as JS numbers. Do not display rounded raw values.
  if (!Number.isSafeInteger(raw)) return "Unavailable";
  return formatAssetAmount(BigInt(raw), precision);
}
