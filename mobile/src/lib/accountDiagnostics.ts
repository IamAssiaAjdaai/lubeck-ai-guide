export function accountDiagnosticsEnabled(
  nodeEnv = process.env.NODE_ENV,
  qaLogs = process.env.EXPO_PUBLIC_CITYWALK_QA_LOGS,
): boolean {
  return nodeEnv !== "production" || qaLogs === "1";
}
