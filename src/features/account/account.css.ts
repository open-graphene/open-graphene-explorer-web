import { style, globalStyle } from "@vanilla-extract/css";
export const heading = style({ overflowWrap: "anywhere", minWidth: 0 });
export const metadata = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px 28px",
  fontSize: 13,
  color: "#bdbdbd",
});
export const tabs = style({
  display: "flex",
  gap: 24,
  borderBottom: "1px solid #424242",
});
export const tab = style({
  padding: "12px 0",
  borderBottom: "2px solid transparent",
  selectors: {
    '&[aria-current="page"]': {
      borderBottomColor: "#50cbbd",
      color: "#50cbbd",
    },
  },
});
export const description = style({
  maxWidth: 480,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
});
export const details = style({ marginTop: 8, color: "#bdbdbd", fontSize: 12 });
globalStyle(`${details} summary`, { cursor: "pointer" });
globalStyle(`${details} pre`, {
  maxWidth: 480,
  maxHeight: 280,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  fontSize: 11,
});
export const footer = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  fontSize: 12,
  color: "#aaa",
});
