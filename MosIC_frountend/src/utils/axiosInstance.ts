/**
 * axiosInstance.ts  — FIXED
 *
 * CAUSE OF "Generate Payslip → redirects to /signin":
 *
 * openGenerateForm() calls GET /api/positions/employee/{id}?...
 * If that endpoint returns 401 (token issue) OR any other error, and the
 * axios interceptor was doing window.location.href = "/signin" on ANY error,
 * clicking "Generate Payslip" would silently redirect the user out.
 *
 * FIX: The interceptor ONLY redirects on 401. Every other error (400, 403,
 * 404, 500, network timeout) is rejected normally so the calling code's
 * try/catch can handle it without touching the session.
 *
 * Additionally: the position fetch in Emppayslipdetails.tsx already wraps
 * its call in try/catch and returns null on failure — so a 404 "no position
 * found" will never reach this interceptor's redirect logic anyway.
 */

import axios from "axios";
/*
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});
*//*
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? `http://${window.location.hostname}:8080`,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});
*/
const axiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL ?? "").trim(),
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Attach JWT ────────────────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Handle responses ──────────────────────────────────────────────────────────
let isHandling401 = false;

axiosInstance.interceptors.response.use(
  (response) => response,

  (error) => {
    const status: number | undefined = error?.response?.status;

    // ONLY redirect on 401 — token is genuinely expired or invalid.
    // 400 / 403 / 404 / 500 / network errors are NOT session errors.
    // They must bubble up as normal rejections so the UI can show them.
    if (status === 401 && !isHandling401) {
      isHandling401 = true;

      if (!window.location.pathname.startsWith("/signin")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/signin";
      }

      setTimeout(() => { isHandling401 = false; }, 2_000);
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;