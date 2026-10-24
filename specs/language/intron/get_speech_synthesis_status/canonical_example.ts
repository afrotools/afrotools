/**
 * @provider Intron
 * @capability get_speech_synthesis_status
 * @atss 1.0
 * @capability_type synchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

interface SpeechStatus {
  processing_status:
    | "TTS_TEXT_AUDIO_QUEUED"
    | "TTS_TEXT_AUDIO_PENDING"
    | "TTS_TEXT_AUDIO_PROCESSING"
    | "TTS_TEXT_AUDIO_GENERATED"
    | "TTS_TEXT_AUDIO_PROCESSING_FAILED";
  audio_path?: string;
  audio_duration_in_seconds?: number;
}

interface IntronResponse {
  data: SpeechStatus;
  message: string;
  status: string; // "Ok" in the documented examples
}

// Error bodies (invalid key, rate limit, …) are not documented — don't assume JSON.
async function readBody<T>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function getSpeechSynthesisStatus(textId: string): Promise<SpeechStatus> {
  const response = await fetch(`https://infer.voice.intron.io/tts/v1/status/${textId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
  });
  const body = await readBody<IntronResponse>(response);
  if (!response.ok || !body?.data) {
    throw new Error(`Intron get_speech_synthesis_status error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return body.data;
}

/*
Usage example:

const status = await getSpeechSynthesisStatus("12a9767f-b865-4404-91d0-a65d4cdt78fs");
// The in-progress example already shows an audio_path: only use it once generated.
if (status.processing_status === "TTS_TEXT_AUDIO_GENERATED" && status.audio_path) {
  // Download auth is not documented: add the Authorization header if the download is refused.
  const audio = await fetch(status.audio_path);
}
*/
