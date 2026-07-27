import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export const API_BASE: string =
  (Constants.expoConfig?.extra as any)?.apiBase ?? "http://localhost:26610";

const TOKEN_KEY = "yosan_token";
const USER_KEY = "yosan_user";

export type StoredUser = {
  user_id: number;
  name: string;
  role: string;
};

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setSession(token: string, user: StoredUser) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// 401(만료/무효 토큰) 발생 시 앱 전역에서 로그인 화면으로 보내기 위한 훅.
// 루트 레이아웃에서 등록한다.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err: any) {
    throw new ApiError(
      `서버에 연결할 수 없습니다.\n${API_BASE}\n(${err?.message ?? "네트워크 오류"})`,
      0,
    );
  }
  if (!res.ok) {
    // 토큰 만료/무효 → 세션 정리 후 로그인으로 유도 (로그인 요청 자체는 제외)
    if (res.status === 401 && !path.includes("/auth/login")) {
      await clearSession();
      unauthorizedHandler?.();
    }
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export type DailyReportPayload = {
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
  meals: {
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    description: string;
    purine_estimate?: string | null;
  }[];
};

export type DailyReport = Omit<DailyReportPayload, "meals"> & {
  id: number;
  patient_id: number;
  meals: {
    id: number;
    meal_type: "breakfast" | "lunch" | "dinner" | "snack";
    description: string;
    purine_estimate?: string | null;
  }[];
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  category: string;
  read: boolean;
  created_at: string;
};

export type SurveyQuestion = {
  code: string;
  text: string;
  options: string[];
};

export type SurveySection = {
  title: string;
  questions: SurveyQuestion[];
};

export type SurveyTemplate = {
  group: "B" | "C";
  name: string;
  description: string;
  sections: SurveySection[];
};

export type SurveyAnswerPayload = {
  question_code: string;
  choice_index: number;
};

export type SurveySubmissionAnswer = SurveyAnswerPayload & {
  choice_label: string;
};

export type SurveySubmission = {
  id: number;
  patient_id: number;
  survey_group: "B" | "C";
  check_date: string;
  notes?: string | null;
  submitted_at: string;
  answers: SurveySubmissionAnswer[];
};

export type MileageMonth = {
  month_index: number;
  is_hospital_visit: boolean;
  amount: number;
  completed: boolean;
  completed_at?: string | null;
  note?: string | null;
  survey_submission_id?: number | null;
  calendar_ym?: string | null; // 이 월차의 달력 월 (YYYY-MM)
  missed?: boolean; // 지난 달인데 미완료 → 빨간 X
};

export type MileageSummary = {
  total_months: number;
  completed_count: number;
  earned_amount: number;
  max_amount: number;
  cycles_completed: number;
  months: MileageMonth[];
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
  category: string; // notice | faq
  is_pinned: boolean;
  is_published: boolean;
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

export type PatientMe = {
  id: number;
  email: string;
  name: string;
  profile: {
    phone?: string | null;
    birth_date?: string | null;
    gender?: string | null;
    height_cm?: number | null;
    baseline_weight_kg?: number | null;
    baseline_uric_acid?: number | null;
    medications?: string | null;
    survey_group?: string | null;
  } | null;
};
