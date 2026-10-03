import { globalStyle, style } from "@vanilla-extract/css";

export const statistics = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  margin: 0,
  padding: "20px 0 4px",
  gap: "4px 0",
  "@media": {
    "(max-width: 700px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
  },
});
export const stat = style({
  minWidth: 0,
  textAlign: "center",
  padding: "8px 16px",
  minHeight: 88,
});
globalStyle(`${stat} dt`, {
  fontSize: 13,
  textTransform: "uppercase",
  color: "#eeeeee",
});
globalStyle(`${stat} dd`, {
  margin: "16px 0 0",
  fontSize: 24,
  lineHeight: 1.3,
  fontWeight: 400,
  overflowWrap: "anywhere",
  fontVariantNumeric: "tabular-nums",
});
export const healthy = style({ color: "#99d939" });
export const warning = style({ color: "#ffb44f" });
export const muted = style({ color: "#b4b4b4", fontSize: 12 });
export const chart = style({ display: "block", width: "100%", height: 80 });
export const chartAxis = style({ stroke: "#777", strokeWidth: 1 });
export const chartBar = style({ fill: "#50cbbd" });
export const chartEmpty = style({
  fontSize: 12,
  color: "#aaa",
  margin: 0,
  minHeight: 80,
});
export const status = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px 20px",
  padding: "8px 16px",
  borderTop: "1px solid #393939",
  borderBottom: "1px solid #393939",
  color: "#b4b4b4",
  fontSize: 12,
  minHeight: 38,
});
export const panels = style({
  flex: 1,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 24,
  padding: "16px",
  "@media": { "(max-width: 850px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
});
export const panel = style({
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
});
globalStyle(`${panel} h2`, {
  fontSize: 23,
  fontWeight: 400,
  margin: "0 0 8px",
});
export const panelTitle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
});
export const panelHint = style({
  fontSize: 12,
  color: "#b4b4b4",
  margin: "0 0 18px",
});
export const tableScroll = style({ overflow: "auto", flex: 1, minHeight: 0 });
export const table = style({
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
});
globalStyle(`${table} th`, {
  textTransform: "uppercase",
  color: "#b4b4b4",
  fontWeight: 400,
  borderBottom: "1px solid #484848",
  padding: "10px 6px 12px",
  fontSize: 12,
});
globalStyle(`${table} td`, { padding: "11px 6px", whiteSpace: "nowrap" });
globalStyle(`${table} tbody tr:hover`, { background: "#303030" });
export const tableHeading = style({
  color: "#b4b4b4",
  textTransform: "uppercase",
  fontSize: 12,
  borderBottom: "1px solid #484848",
  padding: "10px 6px 12px",
});
export const empty = style({
  padding: "24px 6px",
  color: "#b4b4b4",
  fontSize: 14,
});
export const notice = style({
  padding: "10px 12px",
  margin: "8px 0",
  background: "#393328",
  color: "#ffcf8d",
  fontSize: 13,
});
export const activityList = style({ listStyle: "none", margin: 0, padding: 0 });
globalStyle(`${activityList} li`, {
  padding: "16px 6px",
  borderBottom: "1px solid #3c3c3c",
});
globalStyle(`${activityList} summary`, {
  cursor: "pointer",
  fontSize: 12,
  color: "#3cc7ef",
});
export const activityTitle = style({
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
  fontSize: 14,
});
export const json = style({
  fontSize: 12,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  color: "#ccc",
});
export const srOnly = style({
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
});
