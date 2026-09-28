/**
 * OAuth token payload returned by the B2C `oauth2/v2.0/token` endpoint.
 */
export type LoginResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
  id_token?: string;
  scope?: string;
  [key: string]: unknown;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

export type SendCodeRequest = {
  fullName: string;
  email: string;
};

export type AuthStatusResponse = "access_denied" | "invalid_request";

export type LoginErrorResponse = Error & {
  error: AuthStatusResponse;
  error_description: string;
};
