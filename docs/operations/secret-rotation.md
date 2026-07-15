# Secret rotation

Secrets are loaded from environment variables into `SecretProvider` refs. Never commit secrets.

| Ref | Environment variable |
|-----|----------------------|
| `jwt.signing_key` | `AFH_SECRET_JWT_SIGNING_KEY` |
| `jwt.signing_key.previous` | `AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS` |
| `database.url` | `AFH_SECRET_DATABASE_URL` |
| `broker.credential` | `AFH_SECRET_BROKER_CREDENTIAL` |
| `api.secret` | `AFH_SECRET_API_SECRET` |

## JWT rotation (zero-downtime style)

1. Set `AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS` to the **current** signing key.
2. Set `AFH_SECRET_JWT_SIGNING_KEY` to the **new** key (≥ 32 chars).
3. Rolling restart of runtime processes.
4. After all tokens signed with the old key have expired, clear `AFH_SECRET_JWT_SIGNING_KEY_PREVIOUS`.
5. Restart once more.

## Other secrets

Update the env var, restart the process. Database/broker credential changes may require coordinated datastore access updates.
