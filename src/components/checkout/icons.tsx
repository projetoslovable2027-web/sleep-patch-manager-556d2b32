// Inline copies of the lucide icons the checkout uses (ISC license, lucide-react v0.575.0).
// The checkout imports these instead of "lucide-react" so the page doesn't load the whole icon library.
import { createElement, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
type Node = [string, Record<string, string>][];

function make(nodes: Node) {
  return function Icon({ strokeWidth = 2, ...rest }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={rest["aria-label"] ? undefined : true}
        {...rest}
      >
        {nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
      </svg>
    );
  };
}

export const ArrowLeft = make([["path",{"d":"m12 19-7-7 7-7"}],["path",{"d":"M19 12H5"}]]);
export const CreditCard = make([["rect",{"width":"20","height":"14","x":"2","y":"5","rx":"2"}],["line",{"x1":"2","x2":"22","y1":"10","y2":"10"}]]);
export const Loader2 = make([["path",{"d":"M21 12a9 9 0 1 1-6.219-8.56"}]]);
export const Lock = make([["rect",{"width":"18","height":"11","x":"3","y":"11","rx":"2","ry":"2"}],["path",{"d":"M7 11V7a5 5 0 0 1 10 0v4"}]]);
export const ShoppingBag = make([["path",{"d":"M16 10a4 4 0 0 1-8 0"}],["path",{"d":"M3.103 6.034h17.794"}],["path",{"d":"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"}]]);
export const Truck = make([["path",{"d":"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"}],["path",{"d":"M15 18H9"}],["path",{"d":"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"}],["circle",{"cx":"17","cy":"18","r":"2"}],["circle",{"cx":"7","cy":"18","r":"2"}]]);
export const Zap = make([["path",{"d":"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"}]]);
export const Check = make([["path",{"d":"M20 6 9 17l-5-5"}]]);
export const Pencil = make([["path",{"d":"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"}],["path",{"d":"m15 5 4 4"}]]);
export const ShieldCheck = make([["path",{"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}],["path",{"d":"m9 12 2 2 4-4"}]]);
// Filled shield with a white check, used by the "Ambiente seguro" badge in the checkout header.
export function ShieldCheckSolid({ className = "size-4", ...rest }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} aria-hidden="true" {...rest}>
      <path fill="currentColor" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path className="stroke-background" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m8.4 11.8 2.5 2.5 4.7-4.9" />
    </svg>
  );
}
export const CheckCircle2 = make([["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"m9 12 2 2 4-4"}]]);
export const Copy = make([["rect",{"width":"14","height":"14","x":"8","y":"8","rx":"2","ry":"2"}],["path",{"d":"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"}]]);
export const ChevronDown = make([["path",{"d":"m6 9 6 6 6-6"}]]);
export const Minus = make([["path",{"d":"M5 12h14"}]]);
export const Plus = make([["path",{"d":"M5 12h14"}],["path",{"d":"M12 5v14"}]]);
export const Tag = make([["path",{"d":"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"}],["circle",{"cx":"7.5","cy":"7.5","r":".5","fill":"currentColor"}]]);
export const Trash2 = make([["path",{"d":"M10 11v6"}],["path",{"d":"M14 11v6"}],["path",{"d":"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"}],["path",{"d":"M3 6h18"}],["path",{"d":"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"}]]);
export const X = make([["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]]);
