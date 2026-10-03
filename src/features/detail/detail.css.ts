import { globalStyle, style } from "@vanilla-extract/css";
export const content = style({ overflow: "auto", minHeight: 0, flex: 1 });
export const summary = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  "@media": {
    "(max-width: 900px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
    "(max-width: 500px)": { gridTemplateColumns: "1fr" },
  },
  gap: 12,
  margin: "0 0 20px",
});
globalStyle(`${summary} > div`, {
  background: "#262626",
  border: "1px solid #454545",
  padding: 16,
  minWidth: 0,
});
globalStyle(`${summary} dt`, { color: "#aaa", fontSize: 12, marginBottom: 6 });
globalStyle(`${summary} dd`, {
  margin: 0,
  overflowWrap: "anywhere",
  fontVariantNumeric: "tabular-nums",
});
export const section = style({
  padding: 20,
  marginBottom: 16,
  border: "1px solid #424242",
  borderRadius: 4,
  minWidth: 0,
});
globalStyle(`${section} h2`, {
  margin: "0 0 14px",
  fontSize: 18,
  fontWeight: 400,
  overflowWrap: "anywhere",
});
export const code = style({
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  overflow: "auto",
  maxHeight: 360,
  fontSize: 12,
});
export const row = style({
  display: "flex",
  gap: 12,
  alignItems: "end",
  flexWrap: "wrap",
  marginBottom: 12,
});
export const description = style({
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  maxWidth: 900,
});
export const title = style({ overflowWrap: "anywhere", minWidth: 0 });
export const operation = style({
  borderTop: "1px solid #424242",
  padding: "16px 0",
  overflowWrap: "anywhere",
});
globalStyle(`${operation} h3`, { margin: "0 0 6px", fontSize: 14 });
globalStyle(`${operation} p`, { margin: "6px 0 12px" });
globalStyle(`${operation} summary`, { cursor: "pointer", color: "#aaa" });
export const tags = style({
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  listStyle: "none",
  padding: 0,
});
globalStyle(`${tags} li`, {
  background: "#373737",
  padding: "4px 10px",
  borderRadius: 3,
  fontSize: 12,
});
