import { globalStyle, style } from "@vanilla-extract/css";

globalStyle("*", { boxSizing: "border-box" });
globalStyle("body", {
  margin: 0,
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 14,
  lineHeight: 1.5,
  color: "#e5e5e5",
  background: "#282828",
  colorScheme: "dark",
});
globalStyle("a", {
  color: "#31c4ef",
  textDecoration: "none",
  textUnderlineOffset: "0.2em",
});
globalStyle("a:hover", { textDecoration: "underline" });
globalStyle("a:focus-visible, button:focus-visible, summary:focus-visible", {
  outline: "2px solid #50cbbd",
  outlineOffset: 4,
});
globalStyle("button", {
  font: "inherit",
  border: "1px solid #626262",
  borderRadius: 3,
  background: "transparent",
  color: "#e5e5e5",
  cursor: "pointer",
  padding: "4px 10px",
});
globalStyle("button:disabled", { opacity: 0.55, cursor: "wait" });
globalStyle("h1", { fontWeight: 400 });
export const shell = style({
  minHeight: "100dvh",
  "@media": {
    "(min-width: 851px) and (min-height: 750px)": {
      height: "100dvh",
      overflow: "hidden",
    },
  },
  display: "flex",
  flexDirection: "column",
});
export const header = style({
  display: "flex",
  alignItems: "center",
  gap: 32,
  background: "#191919",
  minHeight: 64,
  padding: "0 24px",
  flexWrap: "wrap",
  "@media": { "(max-width: 600px)": { gap: 16, padding: "12px 16px" } },
});
export const brand = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "#f3f3f3",
  fontWeight: 600,
  fontSize: 18,
});
globalStyle(`${brand} svg`, { color: "#00b5e3" });
export const exploreLink = style({
  color: "#fff",
  fontSize: 17,
  fontWeight: 600,
  alignSelf: "stretch",
  display: "flex",
  alignItems: "center",
  padding: "0 24px",
  background: "#282828",
  "@media": { "(max-width: 600px)": { padding: "4px 12px" } },
});
export const navigation = style({
  display: "flex",
  gap: 24,
  marginLeft: "auto",
  fontSize: 13,
});
export const tabs = style({
  display: "flex",
  overflowX: "auto",
  borderBottom: "1px solid #575757",
  minHeight: 45,
  gap: 16,
});
const tab = style({
  flexShrink: 0,
  padding: "12px 16px 10px",
  fontSize: 13,
  textTransform: "uppercase",
});
export const explorerTab = style([
  tab,
  {
    color: "#d8d8d8",
    borderBottom: "3px solid transparent",
    selectors: {
      '&[data-status="active"]': {
        color: "#31c4ef",
        borderBottomColor: "#00b5e3",
      },
    },
  },
]);
export const futureTab = style([tab, { color: "#858585", cursor: "default" }]);
export const content = style({
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
});
export const footer = style({
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 16px",
  color: "#b4b4b4",
  background: "#393939",
  fontSize: 11,
});
export const textPage = style({ padding: "32px 24px", maxWidth: 800 });
export const skipLink = style({
  position: "absolute",
  left: 16,
  top: -100,
  zIndex: 10,
  padding: 12,
  background: "#191919",
  selectors: { "&:focus": { top: 8 } },
});
