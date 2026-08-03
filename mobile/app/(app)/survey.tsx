import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  api,
  SurveySubmission,
  SurveyTemplate,
} from "@/lib/api";
import FontSizeControl from "@/components/FontSizeControl";
import { useFontScale } from "@/lib/fontScale";

const today = () => new Date().toISOString().slice(0, 10);

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  return ymKey(new Date());
}

function parseCheckDateToMonthKey(s: string): string {
  // check_date 는 YYYY-MM-DD 문자열. 안전하게 앞 7자리만.
  return s.slice(0, 7);
}

function nextMonthLabel(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

export default function SurveyScreen() {
  const router = useRouter();
  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [history, setHistory] = useState<SurveySubmission[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { scale } = useFontScale();
  const styles = useMemo(() => makeStyles(scale), [scale]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, h] = await Promise.all([
        api<SurveyTemplate>("/api/v1/surveys/template"),
        api<SurveySubmission[]>("/api/v1/surveys/me"),
      ]);
      setTemplate(t);
      setHistory(h);
    } catch (err: any) {
      setError(err?.message ?? "설문 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const allQuestions = useMemo(
    () => template?.sections.flatMap((s) => s.questions) ?? [],
    [template],
  );
  const remaining = allQuestions.filter(
    (q) => answers[q.code] === undefined,
  ).length;

  const thisMonthSubmission = useMemo(() => {
    const key = currentMonthKey();
    return history.find((s) => parseCheckDateToMonthKey(s.check_date) === key);
  }, [history]);

  const questionTextByCode = useMemo(() => {
    const map: Record<string, string> = {};
    template?.sections.forEach((s) =>
      s.questions.forEach((q) => {
        map[q.code] = q.text;
      }),
    );
    return map;
  }, [template]);

  async function submit() {
    if (!template) return;
    if (remaining > 0) {
      Alert.alert(
        "응답이 부족합니다",
        `아직 ${remaining}개 문항이 미응답입니다.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await api<SurveySubmission>("/api/v1/surveys", {
        method: "POST",
        body: JSON.stringify({
          check_date: today(),
          notes: notes || null,
          answers: Object.entries(answers).map(
            ([question_code, choice_index]) => ({
              question_code,
              choice_index,
            }),
          ),
        }),
      });
      Alert.alert(
        "제출 완료",
        "이번 달 설문이 제출되었습니다.\n다음 달에 다시 작성해 주세요.",
      );
      setAnswers({});
      setNotes("");
      load();
    } catch (err: any) {
      Alert.alert("제출 실패", err?.message ?? "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>설문을 불러올 수 없습니다</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!template) return null;

  // 이번 달에 이미 제출한 경우: 읽기 전용 요약 + 다음 달까지 잠금
  if (thisMonthSubmission) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.fontCard}>
          <Text style={styles.fontCardLabel}>글씨 크기</Text>
          <FontSizeControl />
        </View>
        <View style={styles.doneBanner}>
          <Text style={styles.doneTitle}>✅ 이번 달 설문 제출 완료</Text>
          <Text style={styles.doneSub}>
            제출일: {thisMonthSubmission.check_date}
          </Text>
          <Text style={styles.doneNote}>
            다음 작성 가능: {nextMonthLabel()}{"\n"}
            설문은 한 달에 한 번만 제출합니다.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제출한 응답</Text>
          {thisMonthSubmission.answers.map((a, i) => (
            <View key={a.question_code} style={styles.answerRow}>
              <Text style={styles.answerQ}>
                {i + 1}. {questionTextByCode[a.question_code] ?? a.question_code}
              </Text>
              <Text style={styles.answerA}>→ {a.choice_label}</Text>
            </View>
          ))}
        </View>

        {thisMonthSubmission.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>비고</Text>
            <Text style={styles.notesView}>{thisMonthSubmission.notes}</Text>
          </View>
        ) : null}

      </ScrollView>
    );
  }

  // 이번 달 미제출 — 작성 폼 노출
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.fontCard}>
        <Text style={styles.fontCardLabel}>글씨 크기</Text>
        <FontSizeControl />
      </View>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{template.name}</Text>
        <Text style={styles.bannerSub}>{template.description}</Text>
        <Text style={styles.bannerMeta}>
          한 달에 1회 작성 · 전체 {allQuestions.length}문항 · 미응답{" "}
          {remaining}개
        </Text>
      </View>

      {template.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.questions.map((q, qIdx) => (
            <View key={q.code} style={styles.question}>
              <Text style={styles.qText}>
                {qIdx + 1}. {q.text}
              </Text>
              <View style={styles.options}>
                {q.options.map((opt, i) => {
                  const selected = answers[q.code] === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() =>
                        setAnswers((s) => ({ ...s, [q.code]: i }))
                      }
                      style={[styles.opt, selected && styles.optSelected]}
                    >
                      <View
                        style={[
                          styles.radio,
                          selected && styles.radioSelected,
                        ]}
                      />
                      <Text style={styles.optText}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>비고 (선택)</Text>
        <TextInput
          style={styles.notes}
          multiline
          placeholder="관리자에게 전달할 내용이 있으면 작성해 주세요"
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <TouchableOpacity
        style={[styles.submit, submitting && { opacity: 0.6 }]}
        disabled={submitting}
        onPress={submit}
      >
        <Text style={styles.submitText}>
          {submitting ? "제출 중..." : "이번 달 설문 제출"}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// 글씨 크기 배율(scale)에 따라 폰트 크기가 커지는 동적 스타일.
function makeStyles(scale: number) {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: { fontWeight: "700", color: "#991b1b", marginBottom: 6, fontSize: fs(15) },
  errorBody: { color: "#475569", textAlign: "center", marginBottom: 12, fontSize: fs(14) },
  retry: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "white", fontWeight: "600", fontSize: fs(14) },

  container: { padding: 16, paddingBottom: 80, backgroundColor: "#f8fafc" },
  fontCard: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  fontCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
  },
  banner: {
    backgroundColor: "#eef6ff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  bannerTitle: { fontSize: fs(17), fontWeight: "700", color: "#1d4ed8" },
  bannerSub: { color: "#475569", marginTop: 4, fontSize: fs(14) },
  bannerMeta: { color: "#64748b", marginTop: 8, fontSize: fs(13) },

  doneBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  doneTitle: { fontSize: fs(18), fontWeight: "700", color: "#15803d" },
  doneSub: { color: "#166534", marginTop: 6, fontSize: fs(14) },
  doneNote: {
    color: "#15803d",
    marginTop: 10,
    fontSize: fs(13),
    lineHeight: fs(18),
  },

  section: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  question: { marginBottom: 14 },
  qText: { fontSize: fs(14), color: "#1e293b", marginBottom: 8, lineHeight: fs(20) },
  options: { gap: 6 },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#94a3b8",
    marginRight: 10,
  },
  radioSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  optText: { fontSize: fs(14), color: "#334155", flex: 1 },

  notes: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: fs(14),
    minHeight: 80,
  },
  notesView: { fontSize: fs(14), color: "#334155", lineHeight: fs(20) },

  answerRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  answerQ: { fontSize: fs(13), color: "#334155", marginBottom: 4 },
  answerA: { fontSize: fs(13), color: "#0f172a", fontWeight: "600" },

  submit: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { color: "white", fontWeight: "700", fontSize: fs(16) },

  histRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  histDate: { fontWeight: "600", color: "#1e293b", fontSize: fs(14) },
  histMeta: { color: "#64748b", fontSize: fs(13) },
  });
}
