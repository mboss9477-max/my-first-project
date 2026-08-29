import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";

import { dataset, projectId } from "./env";

const builder = createImageUrlBuilder({ projectId, dataset });

export function urlForImage(source: SanityImageSource) {
  return builder.image(source).auto("format").fit("max");
}

export type ImageDimensions = { width: number; height: number };

type SizedImage = {
  dimensions?: ImageDimensions | null;
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
};

/**
 * Intrinsic size of the image as it will actually render, so `next/image` can
 * reserve the correct aspect ratio instead of assuming one. Accounts for any
 * crop set in the Studio, and optionally caps the width so we don't ask the
 * optimizer to upscale beyond the source we requested.
 */
export function displayDimensions(
  source: SizedImage,
  maxWidth?: number,
): ImageDimensions | null {
  const d = source.dimensions;
  if (!d) return null;

  const crop = source.crop;
  let width = crop
    ? Math.round(d.width * (1 - crop.left - crop.right))
    : d.width;
  let height = crop
    ? Math.round(d.height * (1 - crop.top - crop.bottom))
    : d.height;

  if (maxWidth && width > maxWidth) {
    height = Math.round((height / width) * maxWidth);
    width = maxWidth;
  }

  return { width, height };
}
