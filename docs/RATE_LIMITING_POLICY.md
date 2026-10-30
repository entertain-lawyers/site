# Rate limiting policy

All limits go through `rateLimit()` in `src/lib/rate-limit.ts`.

## Normal operation

- `RATE_LIMITING_ENABLED=true` and both Upstash variables set → distributed sliding-window limits shared by every instance.
- The limiter is keyed by the authenticated user id when there is one, otherwise by client IP (`src/lib/client-ip.ts`). IPs come from a platform-written header (`x-real-ip` on Vercel, `x-nf-client-connection-ip` on Netlify) and never from the client-controlled first hop.

## Limiter outage

- If Upstash is not configured, disabled, or throws, the same call is answered by the per-process in-memory limiter. Every caller stays bounded; the limit is simply per instance instead of global, so the effective cap multiplies by the number of warm instances.
- No route is allowed to skip limiting because the limiter failed. A caller that throws is rejected by the `createSafeAction` wrapper (fail closed).
- Upstash errors are logged as warnings. Alert on a sustained increase so the missing distributed layer is noticed.

## Sensitive routes

| Route | Limit |
| --- | --- |
| Credentials login | 30/IP and 10/account per 15 min |
| Register / resend verification / forgot password | 5/IP per hour |
| OTP verify / reset password | 10/IP per hour (plus 5 wrong guesses invalidate the code) |
| Payment initiation | 10/user per minute |
| AI chat | 5/IP per minute and 40/IP per day |
| Consultation, comments, uploads | route-specific limits in the corresponding action/route |

When adding a new public or costly endpoint, give it an explicit `rateLimitKey` / manual `rateLimit()` call rather than relying on the global defaults.
