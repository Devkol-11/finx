type HttpLabel = {
  method: string;
  route: string;
  statusCode: number;
};

const buckets = [0.005, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

const requestCounts = new Map<string, number>();
const requestDurationBuckets = new Map<string, number>();
const requestDurationSums = new Map<string, number>();
const requestDurationCounts = new Map<string, number>();
const errorCounts = new Map<string, number>();

const startedAt = Date.now();

const escapeLabel = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

const labelsToKey = (labels: Record<string, string | number>): string =>
  Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${escapeLabel(String(value))}"`)
    .join(",");

const increment = (target: Map<string, number>, labels: Record<string, string | number>, amount = 1): void => {
  const key = labelsToKey(labels);
  target.set(key, (target.get(key) ?? 0) + amount);
};

export const recordHttpRequest = (labels: HttpLabel, durationSeconds: number): void => {
  increment(requestCounts, labels);
  increment(requestDurationCounts, {
    method: labels.method,
    route: labels.route,
    statusCode: labels.statusCode,
  });
  increment(requestDurationSums, {
    method: labels.method,
    route: labels.route,
    statusCode: labels.statusCode,
  }, durationSeconds);

  for (const bucket of buckets) {
    if (durationSeconds <= bucket) {
      increment(requestDurationBuckets, {
        method: labels.method,
        route: labels.route,
        statusCode: labels.statusCode,
        le: bucket,
      });
    }
  }

  increment(requestDurationBuckets, {
    method: labels.method,
    route: labels.route,
    statusCode: labels.statusCode,
    le: "+Inf",
  });
};

export const recordHttpError = (labels: Omit<HttpLabel, "statusCode"> & { errorCode: string }): void => {
  increment(errorCounts, labels);
};

const renderMetric = (
  name: string,
  help: string,
  type: "counter" | "gauge" | "histogram",
  values: Map<string, number>,
): string[] => [
  `# HELP ${name} ${help}`,
  `# TYPE ${name} ${type}`,
  ...Array.from(values.entries()).map(([labels, value]) => `${name}{${labels}} ${value}`),
];

export const renderPrometheusMetrics = (): string => {
  const lines: string[] = [];

  lines.push(...renderMetric(
    "finx_http_requests_total",
    "Total HTTP requests received by the API.",
    "counter",
    requestCounts,
  ));
  lines.push(...renderMetric(
    "finx_http_request_duration_seconds_bucket",
    "HTTP request duration histogram buckets.",
    "histogram",
    requestDurationBuckets,
  ));
  lines.push(...renderMetric(
    "finx_http_request_duration_seconds_sum",
    "HTTP request duration total seconds.",
    "histogram",
    requestDurationSums,
  ));
  lines.push(...renderMetric(
    "finx_http_request_duration_seconds_count",
    "HTTP request duration observation count.",
    "histogram",
    requestDurationCounts,
  ));
  lines.push(...renderMetric(
    "finx_http_errors_total",
    "Total operational and unhandled HTTP errors.",
    "counter",
    errorCounts,
  ));
  lines.push("# HELP finx_process_uptime_seconds Process uptime in seconds.");
  lines.push("# TYPE finx_process_uptime_seconds gauge");
  lines.push(`finx_process_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`);

  return `${lines.join("\n")}\n`;
};
