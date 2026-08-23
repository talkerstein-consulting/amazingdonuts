import type { CSSProperties } from 'react';

declare const CurvedInput: (props: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  buttonText?: string;
  type?: string;
  theme?: 'dark' | 'light';
  width?: number;
  bend?: number;
  height?: number;
  cornerRadius?: number;
  borderWidth?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  placeholderColor?: string;
  borderColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  shadowColor?: string;
  shadowSize?: 'sm' | 'md' | 'lg';
  showButton?: boolean;
  showIcon?: boolean;
  className?: string;
  style?: CSSProperties;
}) => JSX.Element;

export default CurvedInput;
