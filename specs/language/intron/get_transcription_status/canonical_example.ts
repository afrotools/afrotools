/**
 * @provider Intron
 * @capability get_transcription_status
 * @atss 1.1
 * @capability_type synchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

interface FileStatus {
  processing_status: "FILE_QUEUED" | "FILE_PENDING" | "FILE_PROCESSING" | "FILE_TRANSCRIBED" | "FILE_PROCESSING_FAILED";
  audio_file_name: string;
  audio_transcript?: string;
  processed_audio_duration_in_seconds?: number;
  // transcript_summary, transcript_answer, transcript_icd_codes / transcript_billing_codes, …
  [field: string]: string | number | undefined;
}

interface IntronResponse {
  data: FileStatus;
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

export async function getTranscriptionStatus(fileId: string): Promise<FileStatus> {
  // get_structured_post_processing=f (default): post-processing comes back as Markdown text.
  const response = await fetch(`https://infer.voice.intron.io/file/v1/status/${fileId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
  });
  const body = await readBody<IntronResponse>(response);
  if (!response.ok || !body?.data) {
    throw new Error(`Intron get_transcription_status error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return body.data;
}

/*
Usage example:

const status = await getTranscriptionStatus("12a9760f-b165-4404-91d0-a65d4cdt78fs");
if (status.processing_status === "FILE_TRANSCRIBED") {
  console.log(status.audio_transcript);
  // get_icd_codes output may be under either name
  console.log(status.transcript_icd_codes ?? status.transcript_billing_codes);
} else if (status.processing_status === "FILE_PROCESSING_FAILED") {
  // resubmit or report
} else {
  // FILE_QUEUED | FILE_PENDING | FILE_PROCESSING — poll again later
}
*/
