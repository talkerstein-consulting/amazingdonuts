import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Class merger the React Bits blocks expect. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
