import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api, SurveySubmission, SurveyTemplate } from "@/lib/api";

export default function SurveyView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submission, setSubmission] = useState<SurveySubmission | null>(null);
  const [template, setTemplate] = useState<SurveyTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [s, t] = await Promise.all([
          api<SurveySubmission>(`/api/v1/surveys/submission/${id}`),
          // 문항 텍스트 매핑용 (환자 그룹 기준). 실패해도 코드로 대체 표기.
          api<SurveyTemplate>("/api/v1/surveys/template").catch(() => null),
        ]);
        setSubmission(s);
        setTemplate(t);
      } catch (e: any) {
        setError(e?.message ?? "설문을 불러올 수 없습니다.");
      }
    })();
  }, [id]);

  const questionTextByCode = useMemo(() => {
    const map: Record<string, string> = {};
    template?.sections.forEach((sec) =>
      sec.questions.forEach((q) => {
        map[q.code] = q.text;
      }),
    );
    return map;
  }, [template]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>설문을 불러올 수 없습니다</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>제출한 설문</Text>
        <Text style={styles.bannerSub}>
          {submission.survey_group}군 · 제출일 {submission.check_date}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>응답 내용</Text>
        {submission.answers.map((a, i) => (
          <View key={a.question_code} style={styles.answerRow}>
            <Text style={styles.answerQ}>
              {i + 1}. {questionTextByCode[a.question_code] ?? a.question_code}
            </Text>
            <Text style={styles.answerA}>→ {a.choice_label}</Text>
          </View>
        ))}
      </View>

      {!!submission.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>비고</Text>
          <Text style={styles.notesView}>{submission.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: { fontWeight: "700", color: "#991b1b", marginBottom: 6 },
  errorBody: { color: "#475569", textAlign: "center" },

  container: { padding: 16, paddingBottom: 60, backgroundColor: "#f8fafc" },
  banner: {
    backgroundColor: "#eef6ff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  bannerTitle: { fontSize: 17, fontWeight: "700", color: "#1d4ed8" },
  bannerSub: { color: "#475569", marginTop: 4 },

  section: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  answerRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  answerQ: { fontSize: 13, color: "#334155", marginBottom: 4 },
  answerA: { fontSize: 13, color: "#0f172a", fontWeight: "600" },
  notesView: { fontSize: 14, color: "#334155", lineHeight: 20 },
});
