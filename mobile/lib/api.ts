import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export const API_BASE: string =
  (Constants.expoConfig?.extra as any)?.apiBase ?? "http://localhost:8000";

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

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
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

export type DailyReport = DailyReportPayload & {
  id: number;
  patient_id: number;
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
