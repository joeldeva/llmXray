# SSO / IdP Integration Plan

Current implementation supports local RBAC users through `ADMIN_USERS_JSON`. Production SSO should be implemented through the customer's IdP.

## Recommended Protocol

Use OpenID Connect Authorization Code + PKCE.

Required IdP metadata:

- Issuer URL
- Client ID
- Client secret, if confidential client
- Redirect URI: `https://llmxray.company.com/api/auth/oidc/callback`
- Allowed email domains
- Role/group claim mapping

## Role Mapping

Map IdP groups to LlmXray roles:

| IdP Group | LlmXray Role |
| --- | --- |
| `LlmXray Admins` | `admin` |
| `LlmXray Auditors` | `auditor` |
| `LlmXray Reviewers` | `reviewer` |

## Implementation Checklist

- Add OIDC login start endpoint.
- Add OIDC callback endpoint.
- Verify ID token signature through JWKS.
- Validate issuer, audience, nonce, expiry.
- Map groups to roles.
- Issue LlmXray session token with role permissions.
- Keep local `ADMIN_USERS_JSON` only as break-glass access.

## Certification Note

SSO cannot be made truly production-final without the actual customer IdP metadata and redirect domains.
