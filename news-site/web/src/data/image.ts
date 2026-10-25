/**
 * Image URLs for the data seam. Pages and components ask for a size here and
 * never build a CMS image URL themselves, so replacing Sanity (plan task 1.9)
 * means changing this file only.
 */
import { urlForImage } from "@/sanity/image";

import type { CmsImage, ImageSource } from "./types";

export { displayDimensions } from "@/sanity/image";
export type { ImageDimensions } from "@/sanity/image";
export type { ImageSource } from "./types";

function isCmsImage(source: ImageSource): source is CmsImage {
  return typeof source === "object" && source !== null && "cms" in source;
}

/**
 * URL of the image at the given width. With a height too, a Sanity image is
 * cropped to that exact box around the editor's hotspot. CMS images come in
 * fixed 16:9 sizes, so the smallest one at least `width` wide is used and the
 * page's own sizing crops it; the height is ignored.
 */
export function imageUrl(
  source: ImageSource,
  size: { width: number; height?: number },
) {
  if (isCmsImage(source)) {
    const { sizes } = source.cms;
    const fit = sizes.find((s) => s.width >= size.width) ?? sizes[sizes.length - 1];
    return fit.url;
  }

  const image = urlForImage(source).width(size.width);
  return size.height
    ? image.height(size.height).fit("crop").url()
    : image.url();
}
