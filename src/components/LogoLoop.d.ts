import type { CSSProperties, ReactNode } from 'react';

export type LogoLoopItem =
  | { src: string; alt?: string; href?: string; title?: string; srcSet?: string; sizes?: string; width?: number; height?: number }
  | { node: ReactNode; href?: string; title?: string; ariaLabel?: string };

export interface LogoLoopProps {
  logos: LogoLoopItem[];
  speed?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  width?: number | string;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  fadeOut?: boolean;
  fadeOutColor?: string;
  scaleOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

declare const LogoLoop: (props: LogoLoopProps) => JSX.Element;
export default LogoLoop;
