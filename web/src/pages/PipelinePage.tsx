const PIPELINE_URL = "https://jisuyun-456.github.io/sincerely-scm-pipeline/";

export function PipelinePage() {
  return (
    <iframe
      src={PIPELINE_URL}
      title="SCM Pipeline Dashboard"
      className="w-full rounded-lg border border-divider/70"
      style={{ height: "calc(100vh - 160px)" }}
    />
  );
}
