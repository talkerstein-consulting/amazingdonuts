export interface CircularGalleryItem {
  image: string;
  text: string;
}

declare const CircularGallery: (props: {
  items?: CircularGalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  fontUrl?: string;
  scrollSpeed?: number;
  scrollEase?: number;
}) => JSX.Element;

export default CircularGallery;
