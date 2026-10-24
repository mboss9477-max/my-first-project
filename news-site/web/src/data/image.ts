/**
 * Image URLs for the data seam. Pages and components ask for a size here and
 * never build a CMS image URL themselves, so replacing Sanity (plan task 1.9)
 * means changing this file only.
 */
import type { SanityImageSource } from "@sanity/image-url";

import { urlForImage } from "@/sanity/image";

export { displayDimensions } from "@/sanity/image";
export type { ImageDimensions } from "@/sanity/image";

/** Anything an article, author or body block carries as an image. */
export type ImageSource = SanityImageSource;

/**
 * URL of the image at the given width. With a height too, the image is cropped
 * to that exact box (around the editor's hotspot, where the CMS supports it);
 * with only a width, the whole image is kept.
 */
export function imageUrl(
  source: ImageSource,
  size: { width: number; height?: number },
) {
  const image = urlForImage(source).width(size.width);
  return size.height
    ? image.height(size.height).fit("crop").url()
    : image.url();
}
