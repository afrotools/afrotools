/**
 * @provider Intron
 * @capability transcribe_audio_sync
 * @atss 1.0
 * @capability_type synchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

type Flag = "TRUE" | "FALSE";

interface TranscribeAudioInput {
  audioFileName: string;
  audio: Blob; // .wav, .mp3, .mp4, .m4a, .ogg, .webm or .flac
  language: string; // use_language_asr_input, e.g. "wo", "sw", "fuc", "ha"
  category?:
    | "file_category_general"
    | "file_category_telehealth"
    | "file_category_procedure"
    | "file_category_call_center"
    | "file_category_legal"
    | "file_category_meeting_notes";
  // Other form fields: use_diarization, get_summary, get_answer, get_call_center_sentiment, …
  options?: Record<string, Flag | string>;
}

interface TranscriptionResult {
  file_id: string;
  processing_status: string;
  audio_file_name: string;
  audio_transcript?: string;
  processed_audio_duration_in_seconds?: number;
  // transcript_summary, transcript_answer, … depending on the get_* options sent
  [field: string]: string | number | undefined;
}

interface IntronResponse {
  data: Partial<TranscriptionResult>;
  message: string;
  status: string; // "Ok" | "Error"
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

export type TranscribeOutcome =
  | { kind: "done"; result: TranscriptionResult }
  // 503 after 120 s: poll get_transcription_status with this id
  | { kind: "timed_out"; fileId: string };

export async function transcribeAudioSync(input: TranscribeAudioInput): Promise<TranscribeOutcome> {
  const form = new FormData();
  form.append("audio_file_name", input.audioFileName);
  form.append("audio_file_blob", input.audio, input.audioFileName);
  form.append("use_language_asr_input", input.language);
  // Intron's default category is file_category_telehealth; this example defaults to general instead.
  form.append("use_category", input.category ?? "file_category_general");
  for (const [key, value] of Object.entries(input.options ?? {})) form.append(key, value);

  // No Content-Type header: fetch sets multipart/form-data with its boundary.
  const response = await fetch("https://infer.voice.intron.io/file/v1/upload/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
    body: form,
  });
  const body = await readBody<IntronResponse>(response);

  // 503 after 120 s carries a file_id: fetch the result with get_transcription_status.
  const fileId = body?.data?.file_id;
  if (response.status === 503 && fileId) {
    return { kind: "timed_out", fileId };
  }
  if (!response.ok || body?.status !== "Ok") {
    // e.g. 400 "audio duration of 65seconds exceeds the max duration of 60seconds"
    throw new Error(`Intron transcribe_audio_sync error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return { kind: "done", result: body.data as TranscriptionResult };
}

/*
Usage example (Node 18+):

import { readFile } from "node:fs/promises";

const audio = new Blob([await readFile("./note.wav")], { type: "audio/wav" });
const outcome = await transcribeAudioSync({
  audioFileName: "note.wav",
  audio,
  language: "wo", // Wolof-English (code-switched)
  options: { get_summary: "TRUE" },
});

if (outcome.kind === "done") {
  console.log(outcome.result.audio_transcript, outcome.result.transcript_summary);
} else {
  // Keep going with get_transcription_status(outcome.fileId)
}

// Keep clips under 60 s: the page says 120 s but its documented 400 enforces 60 s.
*/
