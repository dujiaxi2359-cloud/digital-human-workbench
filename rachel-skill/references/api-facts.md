# API Facts

Last reviewed: 2026-07-16

Use this file as a compact factual baseline. If a task depends on exact request fields, pricing, model availability, or provider limits, verify against official MiniMax and HeyGen documentation before coding or running paid requests.

## MiniMax Overseas Voice Clone

Official docs:

- https://platform.minimax.io/docs/guides/speech-voice-clone
- https://platform.minimax.io/docs/api-reference/voice-cloning-clone
- https://platform.minimax.io/docs/api-reference/speech-t2a-http

Workflow facts used by this skill:

- Source voice files are uploaded through `/v1/files/upload`.
- Voice cloning is created through `/v1/voice_clone`.
- Text-to-audio generation can use `/v1/t2a_v2`.
- Source voice audio should be MP3, M4A, or WAV.
- Source voice audio should be at least 10 seconds and at most 5 minutes.
- Source voice audio should be 20 MB or less.
- Optional prompt audio should be under 8 seconds and paired with exact transcript text.
- Unused cloned voices may be deleted after a short retention window; use or verify the voice soon after cloning.

Recommended production behavior:

- Keep source audio clean: single speaker, no music, no heavy reverb, no unstable volume.
- Generate a short test before producing long narration.
- Keep a stable `voice_id` per speaker when reuse is intended.
- Do not store API keys, Authorization headers, or temporary download URLs in state files.

## HeyGen Image-to-Video and Assets

Official docs:

- https://developers.heygen.com/image-to-video
- https://developers.heygen.com/assets
- https://developers.heygen.com/docs/pricing

Workflow facts used by this skill:

- Assets can be uploaded through the HeyGen Assets API.
- Image-to-Video can be driven by an uploaded image asset and a custom uploaded audio asset.
- Use `audio_asset_id` when the narration is generated outside HeyGen.
- Do not use HeyGen `script + voice_id` when the intended voice is MiniMax-cloned narration, unless the user explicitly changes strategy.
- Normal asset uploads have a size limit; large files may need a direct-upload or provider-specific large-file flow.
- Video jobs should be polled by `video_id`; a timeout is not the same as a failed job.

Recommended production behavior:

- Generate a 15-second preview first, usually at lower resolution.
- Generate full 1080p only after explicit preview approval.
- Download finished videos immediately enough to avoid expired links.
- Decode-check the full MP4 after download; do not rely only on file size or the first few seconds.

## Pricing And Availability

- Do not hard-code historical prices in automation.
- Before large batches, ask the user to confirm current MiniMax and HeyGen pricing, account limits, and quota.
- Treat network calls to MiniMax or HeyGen as paid or potentially billable external actions unless the user says otherwise.
