/**
 * Upload a medical file to the cloud backend used by Health Record Companion (upload.php contract).
 */

export type CloudReportUploadResult = {
  file_url: string;
  summary: string;
};

function parseJsonFromPhpResponse(responseText: string): unknown {
  const first = responseText.indexOf('{');
  const last = responseText.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('Server did not return JSON with file_url and summary.');
  }
  return JSON.parse(responseText.substring(first, last + 1));
}

export async function uploadMedicalReportToCloud(
  uploadUrl: string,
  file: File
): Promise<CloudReportUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Cloud upload error:', responseText);
    throw new Error(`Upload failed (${response.status}). Check VITE_CLOUD_REPORT_UPLOAD_URL and CORS.`);
  }

  let data: unknown;
  try {
    data = parseJsonFromPhpResponse(responseText);
  } catch {
    console.error('Cloud upload raw response:', responseText);
    throw new Error('Server did not return a valid JSON response.');
  }

  const obj = data as Record<string, unknown>;
  const fileUrl = obj.file_url;
  const summary = obj.summary;
  if (typeof fileUrl !== 'string' || typeof summary !== 'string' || !fileUrl.trim() || !summary.trim()) {
    throw new Error('Invalid response: expected file_url and summary strings.');
  }

  return { file_url: fileUrl, summary };
}
