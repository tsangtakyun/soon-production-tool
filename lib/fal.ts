import { fal } from '@fal-ai/client'

export interface FalImageResult {
  imageUrl: string
  requestId?: string
  endpoint: 'text-to-image' | 'edit'
}

interface FalResponse {
  images?: Array<{ url?: string }>
}

interface GenerateOptions {
  prompt: string
  referenceImageUrl?: string | null
}

function ensureFalConfig() {
  if (!process.env.FAL_KEY) {
    throw new Error('缺少 FAL_KEY')
  }

  fal.config({
    credentials: process.env.FAL_KEY,
  })
}

async function withTimeout<T>(request: Promise<T>): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('生成逾時，請重試'))
    }, 180000)
  })

  return Promise.race([request, timeout])
}

export async function generateStoryboardImage({
  prompt,
  referenceImageUrl,
}: GenerateOptions): Promise<FalImageResult> {
  ensureFalConfig()

  const endpoint = referenceImageUrl
    ? 'openai/gpt-image-2/edit'
    : 'openai/gpt-image-2'
  const result = await withTimeout(
    fal.subscribe(endpoint, {
      input: referenceImageUrl
        ? {
            prompt,
            image_urls: [referenceImageUrl],
            image_size: 'landscape_16_9',
            quality: 'medium',
            num_images: 1,
            output_format: 'png',
          }
        : {
            prompt,
            image_size: 'landscape_16_9',
            quality: 'medium',
            num_images: 1,
            output_format: 'png',
          },
      logs: false,
    })
  )

  const data = result.data as FalResponse
  const imageUrl = data.images?.[0]?.url

  if (!imageUrl) {
    throw new Error('fal.ai 無返回圖片 URL')
  }

  return {
    imageUrl,
    requestId: result.requestId,
    endpoint: referenceImageUrl ? 'edit' : 'text-to-image',
  }
}
