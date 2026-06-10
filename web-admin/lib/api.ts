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
