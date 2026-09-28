import { jwtDecode } from "jwt-decode";

type DecodedToken = {
  sub: string;
  name: string;
  emails: string[];
  exp: number;
  iat: number;
};

export function decodeJWT(token?: string) {
  if (!token) {
    return null;
  }
  const decoded = jwtDecode<DecodedToken>(token);
  return decoded ? decoded : null;
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJWT(token);
    if (!decoded) {
      return true;
    }
    const now = Date.now() / 1000;
    return decoded?.exp < now;
  } catch {
    return true;
  }
}
