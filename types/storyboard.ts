export type ProductionShotStatus = 'pending' | 'generating' | 'done' | 'error'

export interface StoryboardExportShot {
  scriptPartRole?: string
  displayOrder?: number
  partOrder?: number
  description?: string
  scriptExcerpt?: string | null
  visualInstruction?: string | null
  contentTypeSlug?: string | null
  visualModeSlug?: string
  footageSourceSlug?: string
  footage_source_slug?: string
  footage_source?: string
  durationSeconds?: number | null
  notes?: string | null
  productionPrompt?: string | null
  production_prompt?: string | null
  productionPromptForSource?: string | null
  stockKeyword?: string | null
}

export interface StoryboardExportJSON {
  version?: string | number
  exportedAt?: string
  script?: {
    id?: string
    topic?: string
    title?: string | null
  }
  storyboard?: {
    id?: string
    title?: string | null
    subjectReference?: string | null
  }
  shots?: StoryboardExportShot[]
}

export interface NormalizedShot {
  shotIndex: number
  shotLabel: string
  productionPrompt: string
}

export interface ProductionSession {
  id: string
  created_at: string
  title: string | null
  raw_json: StoryboardExportJSON
  shot_count: number | null
  ai_shot_count: number | null
  art_direction_prefix: string | null
  reference_image_url: string | null
}

export interface ProductionShot {
  id: string
  session_id: string
  shot_index: number
  shot_label: string | null
  production_prompt: string
  edited_prompt: string | null
  status: ProductionShotStatus
  generated_image_url: string | null
  fal_request_id: string | null
  cost_usd: number | null
  error_message: string | null
  manual_image_url: string | null
  video_source_image_url: string | null
  motion_prompt: string | null
  video_status: 'idle' | 'generating' | 'done' | 'error'
  video_url: string | null
  video_duration: number | null
  video_cost_usd: number | null
  video_error_message: string | null
  video_fal_request_id: string | null
  audio_prompt: string | null
  audio_enabled: boolean | null
  created_at: string
  updated_at: string
}
