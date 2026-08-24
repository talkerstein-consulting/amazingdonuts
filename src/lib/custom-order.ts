export const PRINT_PRODUCTS = new Set(['twelve-custom-printed-donuts', 'twelve-custom-printed-cupcakes']);
export const GLYPH_PRODUCTS = new Set(['letter-number-donut-cake']);
export const minimumQuantityFor = (productId: string) => PRINT_PRODUCTS.has(productId) ? 4 : 1;

export type Artwork = { key: string; name: string; dataUrl: string; count: number; assetId?: string };
export type Customization =
  | { kind: 'print'; icingFlavor: '' | 'Chocolate' | 'Vanilla'; sprinkleColours: string; artworks: Artwork[] }
  | { kind: 'glyph'; glyph: string };

export const customizationFor = (productId: string): Customization | undefined =>
  PRINT_PRODUCTS.has(productId)
    ? { kind: 'print', icingFlavor: '', sprinkleColours: '', artworks: [] }
    : GLYPH_PRODUCTS.has(productId)
      ? { kind: 'glyph', glyph: '' }
      : undefined;

export const customizationComplete = (productId: string, qty: number, customization?: Customization) => {
  if (PRINT_PRODUCTS.has(productId)) {
    return qty >= 4 && customization?.kind === 'print' && !!customization.icingFlavor && customization.artworks.length > 0 && customization.artworks.every(art => art.count > 0 && art.count <= 4) && customization.artworks.reduce((sum, art) => sum + art.count, 0) === qty;
  }
  if (GLYPH_PRODUCTS.has(productId)) return customization?.kind === 'glyph' && customization.glyph.trim().length > 0 && customization.glyph.trim().length <= 120;
  return true;
};

export async function imageDataUrl(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let dataUrl = canvas.toDataURL('image/jpeg', .72);
  while (dataUrl.length > 320000 && canvas.width > 360) {
    const copy = document.createElement('canvas');
    copy.width = Math.round(canvas.width * .8);
    copy.height = Math.round(canvas.height * .8);
    copy.getContext('2d')?.drawImage(canvas, 0, 0, copy.width, copy.height);
    canvas.width = copy.width;
    canvas.height = copy.height;
    canvas.getContext('2d')?.drawImage(copy, 0, 0);
    dataUrl = canvas.toDataURL('image/jpeg', .68);
  }
  return dataUrl;
}
