# Collaboration Report (RC9.4)

## Scope

RC9.4 introduces a **role and permission model** for furnishing projects. Real-time multi-user editing and email delivery are stubbed; permissions are enforced in the client service layer.

## Roles (invite metadata)

When inviting a collaborator, the owner specifies a free-text role label:

- Family
- Client
- Architect
- Interior Designer
- Sales Representative
- Manager

## Permissions

| Permission | Capabilities |
|---|---|
| `view` | Read project, open share link |
| `comment` | View + add notes (future UI) |
| `suggest` | View + suggest changes (future UI) |
| `edit` | Modify rooms, planner saves, consultant sync |
| `owner` | Full control including invites and share links |

Permission ordering is hierarchical: `owner` ≥ `edit` ≥ `suggest` ≥ `comment` ≥ `view`.

## Sharing

`createShareLink(projectId, permission, label)`:

1. Generates opaque 24-char token
2. Registers `token → projectId` in `afh.cx.projects.share`
3. Returns URL `/my-projects?share={token}`

Share permission maps to collaborator permission checks when resolving access.

`openSharedProject(token)` loads the project document for display; editing still requires owner/collaborator identity match via `canAccessProject`.

## Access control

```ts
canAccessProject(project, actorId, needPermission)
```

- Owner (`project.ownerId`) always passes
- Collaborators matched by `id` or `email`
- Unknown actors denied for edit/owner operations
- Share tokens do not grant edit without authenticated collaborator row

## Stubbed (future phases)

- Outbound email for invites
- Server-side ACL sync
- Live presence / concurrent edit locks
- Comment threads UI

## Security notes

- Project ids are UUIDs; invalid ids rejected in `loadProject`
- Share tokens are random, not guessable sequential ids
- No PII in URL beyond opaque token
- `getProject(id, actorId)` returns null when access denied
