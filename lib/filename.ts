const ILLEGAL_FILENAME_CHARS = /[\/\\:*?"<>|]/g

export function sanitizeFilenamePart(value: string) {
  return value.replace(ILLEGAL_FILENAME_CHARS, '-').trim()
}

export function generateVideoFilename(
  shotIndex: number,
  shotLabel: string | null | undefined,
  totalShots?: number | null
) {
  const safeIndex = Number.isFinite(shotIndex) && shotIndex > 0 ? shotIndex : 1
  const padLength = totalShots && totalShots > 99 ? 3 : 2
  const paddedOrder = String(safeIndex).padStart(padLength, '0')
  const label = sanitizeFilenamePart(shotLabel?.trim() || `鏡頭${safeIndex}`)

  return `shot-${paddedOrder}_${label}.mp4`
}
