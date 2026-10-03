import { globalStyle, style } from "@vanilla-extract/css";
export const page = style({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: "28px 32px 16px",
  minHeight: 0,
  flex: 1,
  "@media": { "(max-width: 700px)": { padding: "20px 16px", gap: 16 } },
});
export const heading = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
});
globalStyle(`${heading} h1`, { fontSize: 28, margin: 0, lineHeight: 1.2 });
globalStyle(`${heading} p`, {
  margin: "6px 0 0",
  color: "#b4b4b4",
  fontSize: 13,
});
export const filters = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "end",
  gap: 12,
  padding: 20,
  background: "#242424",
  border: "1px solid #424242",
  borderRadius: 4,
});
globalStyle(`${page} label`, {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  color: "#c5c5c5",
});
globalStyle(`${page} input, ${page} select`, {
  font: "inherit",
  fontSize: 14,
  background: "#282828",
  border: "1px solid #626262",
  borderRadius: 3,
  color: "#ededed",
  padding: "9px 12px",
  minHeight: 40,
  minWidth: 0,
  maxWidth: "100%",
});
globalStyle(`${page} input:focus-visible, ${page} select:focus-visible`, {
  outline: "2px solid #50cbbd",
  outlineOffset: 2,
});
globalStyle(`${page} button`, { minHeight: 38 });
export const searchField = style({ flex: "1 1 220px" });
export const searchButton = style({
  background: "#035f77",
  borderColor: "#28c4ed",
  minWidth: 86,
});
export const toolbar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
});
globalStyle(`${toolbar} p`, {
  margin: 0,
  color: "#c6c6c6",
  fontSize: 13,
  overflowWrap: "anywhere",
});
export const sortControls = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
});
globalStyle(`${sortControls} label`, {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});
export const tableScroll = style({
  overflow: "auto",
  minHeight: 160,
  flex: 1,
  border: "1px solid #424242",
  borderRadius: 4,
});
export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  textAlign: "left",
  fontVariantNumeric: "tabular-nums",
});
globalStyle(`${table} thead th`, {
  position: "sticky",
  top: 0,
  background: "#373737",
  color: "#ddd",
  fontWeight: 400,
  whiteSpace: "nowrap",
  padding: "12px 16px",
  zIndex: 1,
  borderBottom: "1px solid #525252",
});
globalStyle(`${table} tbody th, ${table} td`, {
  padding: "16px",
  borderBottom: "1px solid #383838",
  whiteSpace: "nowrap",
});
globalStyle(`${table} tbody th`, { fontWeight: 500 });
globalStyle(`${table} tbody tr:hover`, { background: "#2e2e2e" });
export const sortButton = style({
  border: "none",
  padding: 0,
  selectors: { [`${page} &`]: { minHeight: 0 } },
  display: "flex",
  gap: 12,
  alignItems: "center",
  textAlign: "inherit",
});
export const numeric = style({ textAlign: "right" });
export const id = style({ color: "#bdbdbd" });
export const muted = style({ color: "#ababab" });
export const external = style({ fontSize: 11, opacity: 0.8 });
export const assetType = style({
  display: "block",
  fontSize: 11,
  color: "#b2b2b2",
  marginTop: 4,
  fontWeight: 400,
});
export const error = style({
  background: "#393328",
  color: "#ffcf8d",
  border: "1px solid #665032",
  borderRadius: 4,
  padding: "12px 16px",
  fontSize: 13,
});
export const empty = style({
  padding: "48px 24px",
  textAlign: "center",
  color: "#bbb",
});
globalStyle(`${empty} h2`, { fontSize: 20, fontWeight: 400, color: "#eee" });
export const pagination = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
  fontSize: 12,
});
export const pageInfo = style({
  display: "flex",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
});
globalStyle(`${pagination} label`, {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});
export const pageButtons = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
});
globalStyle(`${pageButtons} form`, {
  display: "flex",
  gap: 6,
  alignItems: "center",
});
globalStyle(`${pageButtons} input`, { width: 60, padding: "8px 6px" });
export const footnote = style({ margin: 0, fontSize: 11, color: "#aaa" });
