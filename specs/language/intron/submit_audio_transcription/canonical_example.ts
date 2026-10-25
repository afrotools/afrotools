/**
 * @provider Intron
 * @capability submit_audio_transcription
 * @atss 1.1
 * @capability_type asynchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

const BASE_URL = "https://infer.voice.intron.io";

type Flag = "TRUE" | "FALSE";

interface SubmitAudioInput {
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

interface IntronResponse<T> {
  data: T;
  message: string;
  status: string; // "Ok" | "Error"
}

interface FileStatus {
  processing_status: "FILE_QUEUED" | "FILE_PENDING" | "FILE_PROCESSING" | "FILE_TRANSCRIBED" | "FILE_PROCESSING_FAILED";
  audio_file_name: string;
  audio_transcript?: string;
  processed_audio_duration_in_seconds?: number;
  [field: string]: string | number | undefined;
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

export async function submitAudioTranscription(input: SubmitAudioInput): Promise<string> {
  const form = new FormData();
  form.append("audio_file_name", input.audioFileName);
  form.append("audio_file_blob", input.audio, input.audioFileName);
  form.append("use_language_asr_input", input.language);
  // Intron's default category is file_category_telehealth; this example defaults to general instead.
  form.append("use_category", input.category ?? "file_category_general");
  for (const [key, value] of Object.entries(input.options ?? {})) form.append(key, value);

  const response = await fetch(`${BASE_URL}/file/v1/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
    body: form,
  });
  const body = await readBody<IntronResponse<{ file_id?: string }>>(response);
  const fileId = body?.data?.file_id;
  if (!response.ok || !fileId) {
    throw new Error(`Intron submit_audio_transcription error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return fileId;
}

export async function pollTranscription(fileId: string): Promise<FileStatus> {
  const response = await fetch(`${BASE_URL}/file/v1/status/${fileId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
  });
  const body = await readBody<IntronResponse<FileStatus>>(response);
  if (!response.ok || !body?.data) {
    throw new Error(`Intron status error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return body.data;
}

/*
Usage example (Node 18+):

import { readFile } from "node:fs/promises";

const audio = new Blob([await readFile("./call.mp3")], { type: "audio/mpeg" });
const fileId = await submitAudioTranscription({
  audioFileName: "call-2026-10-24.mp3",
  audio,
  language: "ha", // Hausa-English (code-switched)
  category: "file_category_call_center",
  options: { get_summary: "TRUE", get_call_center_sentiment: "TRUE" },
});

// No webhook is documented: poll (status endpoint allows 100 requests/minute).
let status = await pollTranscription(fileId);
while (status.processing_status !== "FILE_TRANSCRIBED" && status.processing_status !== "FILE_PROCESSING_FAILED") {
  await new Promise((r) => setTimeout(r, 5000));
  status = await pollTranscription(fileId);
}
console.log(status.audio_transcript, status.transcript_summary, status.transcript_call_center_sentiment);
*/
