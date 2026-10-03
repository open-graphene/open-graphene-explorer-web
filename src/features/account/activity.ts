import type { Operation } from "@open-graphene/chain-swaplock-bindings";
const operationLabels: Record<number, string> = {
  0: "Transfer",
  1: "Create limit order",
  2: "Cancel limit order",
  3: "Update collateral",
  4: "Fill order",
  5: "Create account",
  6: "Update account",
  7: "Update account whitelist",
  8: "Upgrade account",
  9: "Transfer account",
  10: "Create asset",
  11: "Update asset",
  14: "Issue asset",
  15: "Reserve asset",
  17: "Settle asset",
  20: "Create witness",
  21: "Update witness",
  22: "Create proposal",
  23: "Update proposal",
  24: "Delete proposal",
  29: "Create committee member",
  30: "Update committee member",
  31: "Update chain parameters",
  78: "Create data room",
  79: "Update data room",
  80: "Delete data room",
  85: "Create content card",
};
export function operationLabel(tag: number) {
  return operationLabels[tag] ?? `Operation ${tag}`;
}
export function operationSummary(operation: Operation): string {
  const [tag, value] = operation;
  if (tag === 0) return `${value.from} → ${value.to}`;
  if (tag === 5) return value.name;
  if (tag === 78) return value.name;
  if (tag === 85) return `${value.type} · ${value.room}`;
  // Only short identifiers describe unknown operations; encrypted payloads remain
  // available in the explicitly expanded operation data.
  return (
    Object.entries(value)
      .filter(
        ([key, value]) =>
          key !== "extensions" &&
          typeof value === "string" &&
          value.length < 65 &&
          key !== "memo",
      )
      .slice(0, 3)
      .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`)
      .join(" · ") || "On-chain operation"
  );
}
export function operationJson(operation: Operation): string {
  return JSON.stringify(
    operation,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
}
