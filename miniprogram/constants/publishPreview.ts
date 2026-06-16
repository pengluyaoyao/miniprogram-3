export const PUBLISH_PREVIEW_DRAFT_KEY = 'publishPreviewDraft'

export type XhsCopyPreview = {
  title: string
  body: string
  hashtags: string[]
  highlights: string[]
  coverImagePrompt?: string
}

export type PublishPreviewDraft = {
  copy: XhsCopyPreview
  publishPayload: Record<string, unknown>
}
