import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileIndexRow = {
  id: string;
  f_date: string;
  f_activity: string;
  f_subject: string;
  f_description: string;
  status: string;
  datecreated: string;
};

export type FileIndexFormState = Omit<FileIndexRow, "id">;

export type ActivityRow = {
  id: string;
  activityReferenceNo: string;
  activityDate: string;
  activityRemarks: string;
  activityDocId: string;
  activityDocTable: string;
  activityStatus: string;
};

export type ActivityFormState = Omit<ActivityRow, "id" | "activityReferenceNo">;

export type BlobMeta = {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  description: string;
  status: number | null;
};

// ─── URL helpers ──────────────────────────────────────────────────────────────

export const trimTrailingSlash = (v: string) =>
  v.endsWith("/") ? v.slice(0, -1) : v;

export const ensureLeadingSlash = (v: string) =>
  v.startsWith("/") ? v : `/${v}`;

const API_BASE_URL = trimTrailingSlash(
  (import.meta.env.VITE_API_BASE_URL ?? "").trim(),
);

const FILE_INDEX_ENDPOINT = (
  import.meta.env.VITE_FILE_INDEX_ENDPOINT ?? "/api/files"
).trim();

const COLLECTION_PATH = ensureLeadingSlash(FILE_INDEX_ENDPOINT);

export const COLLECTION_URL = FILE_INDEX_ENDPOINT.startsWith("http")
  ? trimTrailingSlash(FILE_INDEX_ENDPOINT)
  : API_BASE_URL
    ? `${API_BASE_URL}${COLLECTION_PATH}`
    : COLLECTION_PATH;

export const ACTIVITIES_URL = API_BASE_URL
  ? `${API_BASE_URL}/api/activities`
  : "/api/activities";

export const BLOBS_URL = API_BASE_URL
  ? `${API_BASE_URL}/api/blobs`
  : "/api/blobs";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export const createLocalDateTime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export const createLocalDate = () => createLocalDateTime().slice(0, 10);

export const createEmptyFileForm = (): FileIndexFormState => ({
  f_date: createLocalDate(),
  f_activity: "",
  f_subject: "",
  f_description: "",
  //status: "ACTIVE",
  status: "1",
  datecreated: createLocalDateTime(),
});

export const createEmptyActivityForm = (): ActivityFormState => ({
  activityDate: createLocalDate(),
  activityRemarks: "",
  activityDocId: "",
  activityDocTable: "",
 // activityStatus: "ACTIVE",
 activityStatus: "1",
});

// ─── Data mapping helpers ─────────────────────────────────────────────────────

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const readField = (
  src: Record<string, unknown>,
  keys: string[],
): unknown => {
  for (const k of keys) {
    if (src[k] !== undefined && src[k] !== null) return src[k];
  }
  return "";
};

export const readString = (v: unknown) => (v === null ? "" : String(v ?? ""));

export const extractRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isObject(payload)) {
    for (const k of ["data", "content", "items", "results"]) {
      if (Array.isArray(payload[k])) return payload[k] as unknown[];
    }
  }
  return [];
};

export const mapFileRow = (raw: unknown): FileIndexRow | null => {
  if (!isObject(raw)) return null;
  const id = readString(
    readField(raw, ["id", "fileId", "file_index_id", "fileIndexId"]),
  ).trim();
  if (!id) return null;
  return {
    id,
    f_date: readString(readField(raw, ["fileDate", "f_date", "fDate"])),
    f_activity: readString(
      readField(raw, ["fileActivity", "f_activity", "fActivity"]),
    ),
    f_subject: readString(
      readField(raw, ["fileSubject", "f_subject", "fSubject"]),
    ),
    f_description: readString(
      readField(raw, ["fileDescription", "f_description", "fDescription"]),
    ),
    //status: readString(readField(raw, ["fileStatus", "status"])),
    status: (() => {
      const val = readField(raw, ["fileStatus", "status"]);
      if (val === "ACTIVE" || val === 1 || val === "1") return "1";
      return "0";
    })(),
    datecreated: readString(readField(raw, ["datecreated", "dateCreated"])),
  };
};

export const mapActivityRow = (raw: unknown): ActivityRow | null => {
  if (!isObject(raw)) return null;
  const id = readString(readField(raw, ["id"])).trim();
  if (!id) return null;
  return {
    id,
    activityReferenceNo: readString(readField(raw, ["activityReferenceNo"])),
    activityDate: readString(readField(raw, ["activityDate"])),
    activityRemarks: readString(readField(raw, ["activityRemarks"])),
    activityDocId: readString(readField(raw, ["activityDocId"])),
    activityDocTable: readString(readField(raw, ["activityDocTable"])),
    activityStatus: readString(readField(raw, ["activityStatus"])),
  };
};

// ─── Error helper ─────────────────────────────────────────────────────────────

export const getAxiosErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const d = error.response?.data as unknown;
    if (isObject(d) && typeof d.message === "string" && d.message.trim())
      return d.message;
    if (typeof d === "string" && d.trim()) return d;
    if (error.message === "Network Error")
      return "Network Error: blocked (CORS?). Check Vite proxy or Spring Boot CORS config.";
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unable to process the request.";
};

// ─── File size formatter ──────────────────────────────────────────────────────

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Blob helper ──────────────────────────────────────────────────────────────

// True when docId is numeric → points to DOC_BLOB_TABLE
export const isBlobLinked = (docId: string) => /^\d+$/.test(docId.trim());