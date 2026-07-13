export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:26610";

const TOKEN_KEY = "yosan_admin_token";
const USER_KEY = "yosan_admin_user";

export type StoredUser = {
  user_id: number;
  name: string;
  role: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: StoredUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// 이미지 등 파일 업로드 (multipart). 성공 시 { url, key } 반환.
export async function uploadFile(
  file: File
): Promise<{ url: string; key: string }> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/uploads`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as { url: string; key: string };
}

// 업로드 상대경로(/uploads/..) 또는 외부 URL을 표시용 절대 URL로 변환
export function assetUrl(key?: string | null): string {
  if (!key) return "";
  if (/^https?:\/\//.test(key)) return key;
  if (key.startsWith("/")) return `${API_BASE}${key}`;
  return key;
}

export type PatientListItem = {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  last_report_date: string | null;
  days_since_last_report: number | null;
  missed_today: boolean;
};

export type PatientProfile = {
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  baseline_weight_kg?: number | null;
  baseline_uric_acid?: number | null;
  medications?: string | null;
  notes?: string | null;
  survey_group?: "B" | "C" | null;
};

export type SurveyAnswer = {
  question_code: string;
  choice_index: number;
  choice_label: string;
};

export type SurveySubmission = {
  id: number;
  patient_id: number;
  survey_group: "B" | "C";
  check_date: string;
  notes?: string | null;
  submitted_at: string;
  answers: SurveyAnswer[];
};

export type MileageMonth = {
  month_index: number;
  is_hospital_visit: boolean;
  amount: number;
  completed: boolean;
  completed_at?: string | null;
  note?: string | null;
  survey_submission_id?: number | null;
};

export type MileageSummary = {
  total_months: number;
  completed_count: number;
  earned_amount: number;
  max_amount: number;
  cycles_completed: number;
  months: MileageMonth[];
};

export type Patient = {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  profile: PatientProfile | null;
};

export type MealEntry = {
  id: number;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  purine_estimate?: string | null;
};

export type DailyReport = {
  id: number;
  patient_id: number;
  report_date: string;
  weight_kg?: number | null;
  uric_acid?: number | null;
  water_intake_ml?: number | null;
  exercise_minutes?: number | null;
  pain_level?: number | null;
  pain_location?: string | null;
  flare_up?: boolean | null;
  medication_taken?: boolean | null;
  notes?: string | null;
  meals: MealEntry[];
  created_at: string;
  updated_at: string;
};

export type CardNews = {
  id: number;
  title: string;
  author?: string | null;
  summary?: string | null;
  body?: string | null;
  image_key: string;
  images: string[];
  link_url?: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CardNewsIn = {
  title: string;
  author?: string | null;
  summary?: string | null;
  body?: string | null;
  image_key: string;
  images: string[];
  link_url?: string | null;
  display_order: number;
  is_published: boolean;
};

export type InBodyResult = {
  id: number;
  patient_id: number;
  measured_date: string;
  weight_kg?: number | null;
  skeletal_muscle_mass?: number | null;
  body_fat_mass?: number | null;
  bmi?: number | null;
  percent_body_fat?: number | null;
  basal_metabolic_rate?: number | null;
  total_body_water?: number | null;
  inbody_score?: number | null;
  image_key?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
};
