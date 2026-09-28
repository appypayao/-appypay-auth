# @appypay/auth

Shared authorization + OAuth + JWT layer for AppyPay client-side apps.

Extracts the auth concerns that were previously duplicated inside the
backoffice (`src/lib/auth/*`, `src/store/auth-store.ts`,
`src/components/common/permission-guards/*`) into one reusable package:
permission guards, PII masking, the auth/organization stores, the OAuth
client, TanStack Router guards, TanStack Query permission refresh, and Axios
interceptors.

Ships TypeScript source (no build step) — consumers resolve it through
`main`/`types`/`exports` with a bundler-style resolver.

## Install

The package expects to be consumed from source, either as a workspace
package or via `file:` / a git dependency.

```jsonc
// package.json (consumer)
{
  "dependencies": {
    "@appypay/auth": "file:../-appypay-auth" // or "github:appypayao/-appypay-auth"
  }
}
```

## Setup

Call `configureAuth` once, before anything else touches the auth config.

```ts
import { configureAuth } from "@appypay/auth";

configureAuth({
  oauth: {
    url: env.VITE_OAUTH_URL,
    policy: env.VITE_OAUTH_POLICY,
    clientId: env.VITE_OAUTH_CLIENT_ID,
    scope: env.VITE_B2C_SCOPE,
  },
  fetchOperatorMe: getOperatorMe,
  onLogout: () => window.location.reload(),
  toast,
  t: (key, opts) => i18n.t(key, opts) as string,
});
```

| Field             | Required | Purpose                                                        |
| ----------------- | -------- | -------------------------------------------------------------- |
| `oauth`           | yes      | OAuth endpoint, policy, client id, scope                        |
| `fetchOperatorMe` | yes      | Fetches the operator profile — the authoritative permission payload |
| `onLogout`        | no       | Runs after the stores are cleared. Defaults to `location.reload()` |
| `navigate`        | no       | Navigation hook for login / logout redirects                    |
| `toast`           | no       | Toast function for auth errors                                  |
| `t`               | no       | Translate function for auth error copy                          |
| `analytics`       | no       | Called on auth events, including access-denied routing          |
| `routes`          | no       | Override the login / access-denied route paths                  |

## Entry points

Import from the subpath you need, so a consumer only pulls in what it uses.

| Entry point              | Exports                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `@appypay/auth`          | `configureAuth`, `getAuthConfig`, `getAuthConfigOrNull`, `RESOURCES`, `RESOURCE_CODES`, `PERMISSION_CODES`, `AUTH_QUERY_KEYS`, shared types |
| `@appypay/auth/config`   | `configureAuth` and config types                                                                    |
| `@appypay/auth/stores`   | `authStore`, `organizationStore`                                                                    |
| `@appypay/auth/guards`   | `hasPermission`, `canView`, `canCreate`, `canEdit`, `canDelete`, `canCancel`, `canRefund`, `canViewPII`, `canEditPII`, `roleToUserPermissions`, `syncPermissionsFromOperator`, `resolveActiveRole` |
| `@appypay/auth/pii`      | `maskEmail`, `maskPhone`, `maskIBAN`, `maskName`, `maskTaxId`, `maskLast4`, `pii`, `usePIIPermission` |
| `@appypay/auth/react`    | `AuthProvider`, `usePermission`, `usePermissions`, `useHasPermission`, `useAllowedResources`, `Protected`, `PermissionGate`, `CanView`, `CanCreate`, `CanEdit`, `CanDelete` |
| `@appypay/auth/router`   | `requirePermission`, `trackAccessDenied`                                                           |
| `@appypay/auth/query`    | `usePermissionRefresh`                                                                             |
| `@appypay/auth/axios`    | `createAuthInterceptors`, `PermissionRequestMeta`                                                   |
| `@appypay/auth/oauth`    | `login`, `refreshToken`, `logout`, `decodeJWT`, `isTokenExpired`, `createUserAccountApi`             |
| `@appypay/auth/testing`  | `buildPermissions`, `grantPermissions`, `clearPermissions`                                          |

## Permission codes

`RESOURCES` holds the resource codes returned by `GET /users/me`; keep using
the constants rather than raw strings.

```ts
import { RESOURCES, canView } from "@appypay/auth";

canView(RESOURCES.CONF_APP);
```

Actions are `VIEW`, `CREATE`, `EDIT`, `DELETE`, `CANCEL`, `REFUND`, plus the
PII pair `VIEW-PII` / `EDIT-PII`. Note the **hyphen** — these match the codes
the database returns, not `VIEW_PII`.

## Gating UI

```tsx
import { Protected, PermissionGate, usePermission } from "@appypay/auth/react";
import { RESOURCES } from "@appypay/auth";

<Protected action="VIEW-PII" resource={RESOURCES.CONF_APP} fallback={<Masked />}>
  <Secret />
</Protected>;
```

`Protected` unmounts denied children by default; pass `mode="hide"` to keep
them mounted but hidden.

## PII masking

Masking is permission-aware — `pii()` returns the raw value when the operator
holds `VIEW-PII` on the resource and the masked variant otherwise.

```ts
import { pii, maskEmail } from "@appypay/auth/pii";

pii(user.email, RESOURCES.CONF_USRS, maskEmail);
```

`usePIIPermission(resource)` returns a stable `{ canView, canEdit }` pair
subscribed to the store with primitive selectors, so consumers do not
re-render on unrelated auth updates.

## Router guards

```ts
import { requirePermission } from "@appypay/auth/router";

beforeLoad: requirePermission(RESOURCES.ONPAY, "VIEW");
```

`action` defaults to `"VIEW"`. The guard waits for permissions to hydrate
before deciding, and redirects to `/access-denied` or `/login` (carrying a
`returnTo` search param) as appropriate. It reports denials through
`analytics` when one is configured, and never lets an analytics failure
block navigation.

## Testing

`@appypay/auth/testing` provides fixtures for permission state:

```ts
import { clearPermissions, grantPermissions } from "@appypay/auth/testing";

beforeEach(() => clearPermissions());
grantPermissions();
```

## Peer dependencies

`react`, `react-dom`, `zustand`, `axios`, `sonner` are required.
`@tanstack/react-query`, `@tanstack/react-router`, `i18next` and
`react-i18next` are optional — only needed if you use the `query`, `router`
or translated-error features. `jwt-decode` is a direct dependency.

## Development

```sh
pnpm install
pnpm test          # 108 tests across 13 files
pnpm typecheck
pnpm test:coverage
```

The coverage thresholds in `vitest.config.ts` are set to the package's own
test coverage as a regression floor. When this package is consumed from
inside a larger workspace, that app's tests also exercise these modules and
push the real number well above the floor.
