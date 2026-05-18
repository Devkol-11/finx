import assert from "node:assert/strict";
import test from "node:test";
import {
  recordHttpError,
  recordHttpRequest,
  renderPrometheusMetrics,
} from "../metrics";

test("renders request and error metrics in Prometheus text format", () => {
  recordHttpRequest({
    method: "GET",
    route: "/health",
    statusCode: 200,
  }, 0.01);
  recordHttpError({
    method: "POST",
    route: "/api/v1/auth/login",
    errorCode: "INVALID_ACCESS_TOKEN",
  });

  const output = renderPrometheusMetrics();

  assert.match(output, /# TYPE finx_http_requests_total counter/);
  assert.match(output, /finx_http_requests_total\{method="GET",route="\/health",statusCode="200"\} 1/);
  assert.match(output, /finx_http_errors_total\{errorCode="INVALID_ACCESS_TOKEN",method="POST",route="\/api\/v1\/auth\/login"\} 1/);
  assert.match(output, /finx_process_uptime_seconds \d+/);
});
