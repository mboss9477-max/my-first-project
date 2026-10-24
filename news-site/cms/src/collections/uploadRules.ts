import { APIError, type CollectionBeforeOperationHook } from 'payload'

/**
 * Largest image we accept. 25 MB admits ordinary 24-megapixel camera JPEGs
 * (a 17 MB one processed in under a second with ~50 MB extra memory in the
 * trial) while still stopping raw files and huge exports.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const HEIC = /\.(heic|heif)$/i

/**
 * Runs before Payload's own checks so writers get a plain-English reason,
 * not a technical error, for the two mistakes they will actually make:
 * an iPhone photo in HEIC format, and a full-size camera original.
 */
export const friendlyUploadRules: CollectionBeforeOperationHook = ({ operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return
  const file = req.file
  if (!file) return

  if (HEIC.test(file.name ?? '') || /image\/hei[cf]/i.test(file.mimetype ?? '')) {
    throw new APIError(
      'This photo is in iPhone HEIC format, which the website cannot show. ' +
        'Export it as JPEG first, or set the iPhone camera to "Most Compatible" ' +
        '(Settings > Camera > Formats).',
      400,
      undefined,
      true,
    )
  }

  if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new APIError(
      `This image is ${mb} MB. Please upload an image under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB ` +
        '(export it at a smaller size, or ask an editor to resize it).',
      413,
      undefined,
      true,
    )
  }
}
