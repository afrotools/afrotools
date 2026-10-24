/**
 * @provider Intron
 * @capability synthesize_speech_sync
 * @atss 1.0
 * @capability_type synchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

interface SynthesizeSpeechInput {
  text: string;
  voice_language: string; // e.g. "wo", "ha", "sw", "en"
  voice_accent: string; // must be listed for voice_language, e.g. "wolof" for "wo"
  voice_gender: "male" | "female";
  output_audio_format?: "wav" | "opus"; // default wav
}

interface GeneratedAudio {
  audio_duration_in_seconds?: number;
  audio_path?: string;
  processing_status?: string;
  text_id?: string; // only in the documented 503 body
}

interface IntronResponse {
  data: GeneratedAudio;
  message: string;
  status: string;
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

export type SynthesizeOutcome =
  | { kind: "done"; audioPath: string; durationSeconds?: number }
  // 503 after 120 s: poll get_speech_synthesis_status with this id
  | { kind: "timed_out"; textId: string };

export async function synthesizeSpeechSync(input: SynthesizeSpeechInput): Promise<SynthesizeOutcome> {
  const response = await fetch("https://infer.voice.intron.io/tts/v1/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INTRON_API_KEY}`,
      "Content-Type": "application/json", // required by the header table
    },
    body: JSON.stringify(input),
  });
  const body = await readBody<IntronResponse>(response);

  const textId = body?.data?.text_id;
  if (response.status === 503 && textId) {
    return { kind: "timed_out", textId };
  }
  // Defensive: the docs only show a 200 with TTS_TEXT_AUDIO_GENERATED and an audio_path.
  const audioPath = body?.data?.audio_path;
  if (!response.ok || body?.data?.processing_status !== "TTS_TEXT_AUDIO_GENERATED" || !audioPath) {
    // e.g. 400 "invalid text voice accent,{accent} not supported for language {language}"
    throw new Error(`Intron synthesize_speech_sync error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return { kind: "done", audioPath, durationSeconds: body.data.audio_duration_in_seconds };
}

/*
Usage example:

const outcome = await synthesizeSpeechSync({
  text: "Jërëjëf ci sa ndimbal.",
  voice_language: "wo",
  voice_accent: "wolof",
  voice_gender: "female",
});

if (outcome.kind === "done") {
  // audio_path lifetime and download auth are not documented: download it right away;
  // add the Authorization header if the download is refused.
  const audio = await fetch(outcome.audioPath);
} else {
  // Keep going with get_speech_synthesis_status(outcome.textId)
}

// Keep text short: the page says 4096 characters but this endpoint's documented 400 says 100.
*/
