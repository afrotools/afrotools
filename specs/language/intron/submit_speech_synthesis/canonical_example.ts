/**
 * @provider Intron
 * @capability submit_speech_synthesis
 * @atss 1.0
 * @capability_type asynchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

const BASE_URL = "https://infer.voice.intron.io";

interface SubmitSpeechInput {
  text: string;
  voice_language: string; // e.g. "sw", "wo", "ha", "en"
  voice_accent: string; // must be listed for voice_language, e.g. "swahili" for "sw"
  voice_gender: "male" | "female";
  output_audio_format?: "wav" | "opus"; // default wav
}

interface IntronResponse<T> {
  data: T;
  message: string;
  status: string;
}

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

// Error bodies (invalid key, rate limit, …) are not documented — don't assume JSON.
async function readBody<T>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function submitSpeechSynthesis(input: SubmitSpeechInput): Promise<string> {
  const response = await fetch(`${BASE_URL}/tts/v1/enqueue`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INTRON_API_KEY}`,
      "Content-Type": "application/json", // required by the header table
    },
    body: JSON.stringify(input),
  });
  const body = await readBody<IntronResponse<{ text_id?: string }>>(response);
  const textId = body?.data?.text_id;
  if (!response.ok || !textId) {
    // e.g. 400 "tts text character count greater than the max limit of 1200 characters"
    throw new Error(`Intron submit_speech_synthesis error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return textId;
}

export async function pollSpeechSynthesis(textId: string): Promise<SpeechStatus> {
  const response = await fetch(`${BASE_URL}/tts/v1/status/${textId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
  });
  const body = await readBody<IntronResponse<SpeechStatus>>(response);
  if (!response.ok || !body?.data) {
    throw new Error(`Intron TTS status error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return body.data;
}

/*
Usage example:

const textId = await submitSpeechSynthesis({
  text: "Karibu! Duka litafunguliwa saa mbili asubuhi.",
  voice_language: "sw",
  voice_accent: "swahili",
  voice_gender: "male",
});

// No webhook is documented: poll (status endpoint allows 100 requests/minute; the interval and cap are this example's choice).
let status = await pollSpeechSynthesis(textId);
for (let attempt = 0; attempt < 100 && status.processing_status !== "TTS_TEXT_AUDIO_GENERATED" && status.processing_status !== "TTS_TEXT_AUDIO_PROCESSING_FAILED"; attempt++) {
  await new Promise((r) => setTimeout(r, 3000));
  status = await pollSpeechSynthesis(textId);
}
if (status.processing_status === "TTS_TEXT_AUDIO_GENERATED") {
  console.log(status.audio_path); // lifetime not documented: download it right away
}
*/
