import { globalStyle, style } from "@vanilla-extract/css";
export const overview = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 1,
  background: "#454545",
  border: "1px solid #454545",
  borderRadius: 4,
  margin: 0,
  "@media": {
    "(max-width: 700px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  },
});
globalStyle(`${overview} > div`, {
  padding: "14px 18px",
  background: "#262626",
  minWidth: 0,
});
globalStyle(`${overview} dt`, { fontSize: 11, color: "#aaa", marginBottom: 8 });
globalStyle(`${overview} dd`, {
  margin: 0,
  fontSize: 15,
  overflowWrap: "anywhere",
  fontVariantNumeric: "tabular-nums",
});
export const producing = style({
  color: "#6bd9b7",
  fontSize: 11,
  display: "block",
  marginTop: 5,
});
