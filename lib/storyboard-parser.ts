import type {
  NormalizedShot,
  StoryboardExportJSON,
  StoryboardExportShot,
} from '@/types/storyboard'

export interface ParseResult {
  title: string
  shotCount: number
  aiShots: NormalizedShot[]
}

const visualModeCopy: Record<string, string> = {
  talking_head: 'talking-head documentary frame',
  spatial_reconstruction: 'spatial reconstruction',
  archive_footage: 'archival documentary imagery',
  animation_diagram: 'clean editorial diagram style',
  map_pull: 'map-based editorial visual',
  street_b_roll: 'street documentary b-roll',
  lyrical_imagery: 'lyrical cinematic imagery',
  photo_document_pan: 'photo-document editorial image',
  data_viz: 'data-driven editorial visual',
  verite: 'verite documentary realism',
}

const contentTypeCopy: Record<string, string> = {
  statistic: 'a statistical idea',
  historical_event: 'a historical event',
  spatial_mechanism: 'a spatial mechanism',
  geography_location: 'a geographic location',
  document_quote: 'a document or quoted source',
  abstract_emotion: 'an abstract emotional beat',
  host_thesis: 'the host thesis',
  urban_life: 'urban life',
  system_pattern: 'a system pattern',
  organic_moment: 'an organic human moment',
  comparison_contrast: 'a comparison or contrast',
  process_procedure: 'a process or procedure',
}

export function getFootageSource(shot: StoryboardExportShot): string | undefined {
  return shot.footageSourceSlug ?? shot.footage_source_slug ?? shot.footage_source
}

export function getProductionPrompt(shot: StoryboardExportShot): string | undefined {
  const value = shot.productionPrompt ?? shot.production_prompt
  return typeof value === 'string' ? value : undefined
}

function mostlyAscii(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  let asciiCount = 0
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed.charCodeAt(index) <= 127) asciiCount += 1
  }
  return asciiCount / trimmed.length > 0.8 ? trimmed : undefined
}

function buildEnglishFallbackPrompt(
  shot: StoryboardExportShot,
  storyboard: StoryboardExportJSON
): string {
  const subject =
    mostlyAscii(storyboard.storyboard?.subjectReference) ||
    mostlyAscii(storyboard.storyboard?.title) ||
    mostlyAscii(storyboard.script?.topic) ||
    'the storyboard subject'
  const visualMode = shot.visualModeSlug
    ? visualModeCopy[shot.visualModeSlug] ?? shot.visualModeSlug.replaceAll('_', ' ')
    : 'cinematic editorial image'
  const contentType = shot.contentTypeSlug
    ? contentTypeCopy[shot.contentTypeSlug] ?? shot.contentTypeSlug.replaceAll('_', ' ')
    : 'the story beat'
  const role = shot.scriptPartRole?.replaceAll('_', ' ') ?? 'storyboard beat'
  const duration = shot.durationSeconds ? `${shot.durationSeconds}-second` : 'short'

  return [
    `Create a 16:9 landscape production preview image for a SOON YouTube storyboard about ${subject}.`,
    `Shot role: ${role}.`,
    `Visual mode: ${visualMode}.`,
    `Content focus: ${contentType}.`,
    `This is a ${duration} beat, so the image should read instantly and clearly.`,
    'Use a sophisticated documentary editorial style, cinematic composition, realistic lighting, high visual clarity, and strong foreground-background separation.',
    'Do not include readable text, captions, subtitles, logos, UI, watermarks, or distorted typography.',
  ].join('\n')
}

export function getDefaultTitle(data: StoryboardExportJSON): string {
  return (
    data.storyboard?.title?.trim() ||
    data.script?.title?.trim() ||
    data.script?.topic?.trim() ||
    `製作 Session ${new Date().toLocaleString()}`
  )
}

export function parseStoryboardJSON(data: unknown): ParseResult {
  if (!data || typeof data !== 'object') {
    throw new Error('JSON schema 唔符合，缺少 shots')
  }

  const storyboard = data as StoryboardExportJSON
  if (!Array.isArray(storyboard.shots)) {
    throw new Error('JSON schema 唔符合，缺少 shots')
  }

  const missingFootageSource = storyboard.shots.find(
    (shot) => getFootageSource(shot) === undefined
  )
  if (missingFootageSource) {
    throw new Error('JSON schema 唔符合，缺少 footageSourceSlug')
  }

  const aiShots = storyboard.shots
    .map((shot, index) => ({ shot, index }))
    .filter(({ shot }) => getFootageSource(shot) === 'ai_generation')
    .map(({ shot, index }) => {
      const prompt =
        getProductionPrompt(shot)?.trim() || buildEnglishFallbackPrompt(shot, storyboard)
      const displayOrder = Number.isFinite(shot.displayOrder)
        ? Number(shot.displayOrder)
        : index
      const shotIndex = displayOrder + 1

      return {
        shotIndex,
        shotLabel: `鏡頭 ${shotIndex}`,
        productionPrompt: prompt,
      }
    })

  if (aiShots.length === 0) {
    throw new Error('呢個 storyboard 冇 AI generation shots，請確認 footage source 設定')
  }

  return {
    title: getDefaultTitle(storyboard),
    shotCount: storyboard.shots.length,
    aiShots,
  }
}
