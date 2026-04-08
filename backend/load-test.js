import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
stages: [
  { duration: '30s', target: 100 },
  { duration: '1m', target: 300 },
  { duration: '1m', target: 500 },
  { duration: '30s', target: 0 },
],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  const baseUrl = "http://localhost:3000";

  const loginPayload = JSON.stringify({
    countryCode: "+91",
    mobileNumber: "9876543222",
    password: "sysadmin123"
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post(
    baseUrl + "/api/v1/auth/login",
    loginPayload,
    params
  );

  const body = JSON.parse(res.body);

  if (!body.success || !body.data?.accessToken) {
    throw new Error("Login failed: " + res.body);
  }

  return {
    baseUrl,
    token: body.data.accessToken,
  };
}

export default function (data) {

  const params = {
    headers: {
      Authorization: "Bearer " + data.token,
    },
  };

  group("Candidates Overview API", () => {
    const res = http.get(
      data.baseUrl +
      "/api/v1/candidates/overview?page=1&limit=10&status=all&dateFilter=all",
      params
    );

    check(res, {
      "overview status 200": (r) => r.status === 200,
    });
  });

  group("Candidates List API", () => {
    const res = http.get(
      data.baseUrl + "/api/v1/candidates?page=1&limit=10",
      params
    );

    check(res, {
      "candidates list status 200": (r) => r.status === 200,
    });
  });

  sleep(0.5);
}