import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 150 },
    { duration: "1m", target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<600"],
  },
};

const BASE_URL = "http://localhost:3000"; 
// change to production later

export function setup() {
  const loginPayload = JSON.stringify({
    countryCode: "+91",
    mobileNumber: "9876543222",
    password: "sysadmin123",
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, params);

  const body = JSON.parse(res.body);

  if (!body.success || !body.data?.accessToken) {
    throw new Error("Login failed: " + res.body);
  }

  return {
    token: body.data.accessToken,
  };
}

export default function (data) {
  const params = {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  };

  group("Candidates Overview API", () => {
    const res = http.get(
      `${BASE_URL}/api/v1/candidates/overview?page=1&limit=10&status=all&dateFilter=all`,
      params
    );

    check(res, {
      "overview status is 200": (r) => r.status === 200,
      "overview latency < 600ms": (r) => r.timings.duration < 600,
    });
  });

  group("Candidates List API", () => {
    const res = http.get(
      `${BASE_URL}/api/v1/candidates?page=1&limit=10`,
      params
    );

    check(res, {
      "candidates status is 200": (r) => r.status === 200,
      "candidates latency < 600ms": (r) => r.timings.duration < 600,
    });
  });

  sleep(0.5);
}