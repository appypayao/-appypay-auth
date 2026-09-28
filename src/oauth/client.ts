import axios, { type AxiosInstance } from "axios";
import { getAuthConfig } from "../config";
import type { LoginCredentials, LoginResponse } from "../types";

/**
 * OAuth client. Reads OAuth URL/policy/clientId/scope from `configureAuth`
 * at call time so consumers only need to bootstrap once and can rotate
 * config in tests without re-importing.
 */

const buildOAuthAxios = (): AxiosInstance => {
  const { oauth } = getAuthConfig();
  return axios.create({
    baseURL: `${oauth.url}/${oauth.policy}/`,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
};

export const login = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  const { oauth } = getAuthConfig();
  const client = buildOAuthAxios();
  const response = await client.post<LoginResponse>(
    "oauth2/v2.0/token",
    new URLSearchParams({
      grant_type: "password",
      client_id: oauth.clientId,
      scope: oauth.scope,
      ...credentials,
    })
  );
  return response.data;
};

export const refreshToken = async (
  refresh_token: string
): Promise<LoginResponse> => {
  const client = buildOAuthAxios();
  const response = await client.post<LoginResponse>(
    "oauth2/v2.0/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    })
  );
  return response.data;
};

/**
 * Factory that binds a set of user-account HTTP helpers to the app's own
 * axios instance (the one carrying the auth interceptors). Kept as a
 * factory so the shared package does not depend on an app-owned axios
 * instance at import time.
 */
export const createUserAccountApi = (api: AxiosInstance) => ({
  register: async (data: FormData) => {
    const response = await api.post("user/account", data);
    return response.data;
  },
  sendCode: async (data: FormData) => {
    const response = await api.post("user/account/verification-code", data);
    return response.data;
  },
  requestResetPasswordCode: async (data: FormData) => {
    const response = await api.post(
      "user/account/password/reset/request",
      data
    );
    return response.data;
  },
  confirmResetPasswordCode: async (data: FormData) => {
    const response = await api.post(
      "user/account/verification-code/confirm",
      data
    );
    return response.data;
  },
  changePassword: async (data: FormData) => {
    const response = await api.post(
      "user/account/password/reset/confirm",
      data
    );
    return response.data;
  },
});
