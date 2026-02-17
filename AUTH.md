# Authentication — KIT Identity Integration

SMDT currently has local authentication (demo/full accounts). This document outlines the options for integrating KIT single sign-on.

## Options Overview

| Option | Protocol | Recommended | Effort |
|--------|----------|-------------|--------|
| **OpenID Connect** | OAuth 2.0 / JWT | Yes | Low |
| **Shibboleth** | SAML 2.0 | Fallback | Medium |
| **KIT-AD LDAP** | LDAP | Not for web apps | High |
| **KIT LDAP (OpenLDAP)** | LDAP | Not for web apps | High |

## Recommended: OpenID Connect (OIDC)

The simplest and most secure option for a Next.js web app.

**Advantages:**
- Users never enter passwords in our app — they authenticate at KIT's IdP
- Native NextAuth.js support (built-in provider)
- Works outside KIT network (HTTPS-based)
- Minimal code (~30 lines of config)

**What we need from SCC:**
- Register SMDT as an OIDC client
- Receive: `client_id`, `client_secret`, OIDC discovery URL
- Provide: redirect URI, e.g. `https://<our-domain>/api/auth/callback/kit`

**Implementation:**
- Install `next-auth`
- Configure a generic OIDC provider in NextAuth.js
- Add middleware to protect routes
- Add a login page

**Contact:** `servicedesk@scc.kit.edu`

## Fallback: Shibboleth (SAML 2.0)

Use if SCC does not offer OIDC.

**Advantages:**
- Definitely available — KIT is part of DFN-AAI
- Enables federation (users from other German universities)

**Disadvantages:**
- No native NextAuth.js support — requires `@node-saml/passport-saml` or similar
- More complex setup: SAML metadata exchange, XML signing, certificate management

**What we need from SCC:**
- Register as a SAML Service Provider (SP)
- Receive: IdP metadata URL, entity ID
- Provide: SP metadata (assertion consumer service URL, signing certificate)

## Not Recommended for Web Apps: Direct LDAP

### KIT-AD LDAP

- Server: `kit-ad.scc.kit.edu`
- Ports: 636 (LDAPS), 389 (STARTTLS), 3269/3268 (Global Catalog)
- TLS mandatory
- KIT network only
- Users authenticate with their KIT credentials (direct bind)
- Objects should be searched by CN, not referenced statically by DN

### KIT LDAP (OpenLDAP)

- Central directory service connected to KIT Identity Management
- Requires a proxy service account, requested by the ITB via Service Desk
- KIT network only
- Contact: Patrick von der Hagen via `servicedesk@scc.kit.edu`

### Why LDAP is not recommended

- Restricted to KIT network (no external access)
- Our app would handle user passwords directly
- Requires managing LDAP connections and session logic manually
- More bureaucracy (service accounts, ITB approval)

## Next Steps

1. Contact SCC (`servicedesk@scc.kit.edu`):
   > "We are building a web application (SMDT) and want to use KIT single sign-on.
   > Do you offer OpenID Connect, or should we use Shibboleth/SAML?
   > We would prefer OIDC if available."
2. Once SCC responds, implement the appropriate auth flow
3. Decide which routes to protect (entire app vs. specific pages)
