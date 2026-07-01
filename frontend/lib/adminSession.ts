"use client";

import { isAxiosError } from "axios";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const ADMIN_LOGIN_PATH = "/login";

export function redirectToAdminLogin(router: AppRouterInstance) {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin-token");
  }

  router.replace(ADMIN_LOGIN_PATH);
}

export function getAdminTokenOrRedirect(router: AppRouterInstance) {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("admin-token");

  if (!token) {
    redirectToAdminLogin(router);
    return null;
  }

  return token;
}

export function handleAdminAuthError(error: unknown, router: AppRouterInstance) {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  if (status === 401 || status === 403) {
    redirectToAdminLogin(router);
    return true;
  }

  return false;
}
