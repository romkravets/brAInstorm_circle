# Brainstorm Circle — Implementation Spec (Automation Phase)

Date: 2026-07-17
Status: approved for implementation

## 1. Goal

Move from manual copy-paste orchestration to one-click guided brainstorm flow for non-technical users while preserving advanced manual mode.

Core user outcome:

- Enter question
- Click one button
- Get multi-model answers, cross-check, and final synthesis

## 2. Scope

In scope:

- State model extension in useSession reducer
- UI integration in BrainstormApp and ParticipantCard
- New Next.js route handlers for generation and orchestration
- Backward-compatible localStorage migration

Out of scope:

- Auth/billing
- DB persistence beyond localStorage
- Full provider marketplace

## 3. Current pain points to fix

1. Response textarea can desync between rounds due to uncontrolled input usage.
2. Manual-only flow is too complex for non-technical users.
3. Distillation requires manual external step, no automated end-to-end pipeline.
4. No unified backend orchestration contract for single run vs full round run.

## 4. File-level change plan

### 4.1 app/BrainstormApp.jsx

Required changes:

- Replace direct local Ollama call path with API calls to app/api endpoints.
- Add run orchestrator actions:
  - runSingleParticipant(participantId)
  - runRoundAuto()
  - runSynthesisAuto()
- Add round-run progress state in UI (idle/running/done/failed + progress counters).
- Fix mobile quick action that currently targets first participant only.
- Update ParticipantCard key to include round id for safe remount when switching rounds:
  - key format: `${currentRound.id}:${p.id}`

New helper functions inside component:

- buildInitialPrompt(participant)
- callGenerateEndpoint(payload)
- callRunRoundEndpoint(payload)
- callSynthesizeEndpoint(payload)

### 4.2 components/ParticipantCard.jsx

Required changes:

- Convert textarea to controlled input (`value`) with local draft sync.
- Keep debounce on change, but sync draft from props when round/response changes.
- Add explicit per-card status visuals:
  - Generating
  - Ready
  - Error (human-readable message)
- Keep manual mode behavior: open prompt + URL, do not auto-call provider.

Props to add:

- `runStatus` (`idle|running|done|error`)
- `runError` (string | empty)
- `canAutoRun` (boolean)

### 4.3 hooks/useSession.js

Required changes:

- Extend session schema with run metadata.
- Add reducer actions for orchestration lifecycle.
- Block NEW_ROUND while run is active.
- Bump local storage version from 2.0 to 2.1 and provide migration fallback.

New state shape additions:

```js
runMeta: {
  status: 'idle' | 'running' | 'done' | 'failed',
  stage: 'idle' | 'generating' | 'cross_check' | 'synthesis',
  startedAt: number | null,
  finishedAt: number | null,
  total: number,
  completed: number,
  errors: string[],
}

participantMeta: {
  [participantId]: {
    status: 'idle' | 'running' | 'done' | 'error',
    error: string,
    latencyMs: number | null,
    updatedAt: number | null,
  }
}
```

New reducer actions:

- `START_ROUND_RUN`
- `SET_RUN_STAGE`
- `SET_PARTICIPANT_RUNNING`
- `SET_PARTICIPANT_DONE`
- `SET_PARTICIPANT_ERROR`
- `FINISH_ROUND_RUN`
- `FAIL_ROUND_RUN`
- `RESET_RUN_META`

## 5. New route handlers

All routes are App Router handlers under app/api.

### 5.1 GET app/api/health/ollama/route.js

Purpose:

- Health probe for local Ollama and installed models list.

Response:

```json
{
  "ok": true,
  "running": true,
  "models": ["llama3.1", "gemma2"]
}
```

Failure response:

```json
{
  "ok": false,
  "running": false,
  "error": "ollama_unreachable"
}
```

### 5.2 POST app/api/ai/generate/route.js

Purpose:

- Unified single-model generation endpoint.

Request schema:

```json
{
  "provider": "ollama",
  "model": "llama3.1",
  "prompt": "...",
  "temperature": 0.3,
  "maxTokens": 1200
}
```

Supported providers (phase order):

- Phase 1: `ollama`
- Phase 2: `anthropic`, `openai`, `gemini`

Response schema:

```json
{
  "ok": true,
  "text": "generated response",
  "latencyMs": 1823,
  "usage": { "inputTokens": 0, "outputTokens": 0 },
  "provider": "ollama",
  "model": "llama3.1"
}
```

Error schema:

```json
{
  "ok": false,
  "error": "model_not_found",
  "message": "Run: ollama pull llama3.1"
}
```

### 5.3 POST app/api/brainstorm/run-round/route.js

Purpose:

- Run full round orchestration in one request.

Request schema:

```json
{
  "question": "...",
  "mode": "synthesis",
  "participants": [
    {
      "id": "p1",
      "name": "Llama",
      "respondMode": "ollama",
      "provider": "ollama",
      "model": "llama3.1",
      "role": "Аналітик"
    }
  ],
  "round": { "id": 2, "label": "Раунд 2" },
  "settings": {
    "crossCheck": true,
    "crossCheckModel": "gemma2",
    "timeoutMs": 120000
  }
}
```

Response schema:

```json
{
  "ok": true,
  "stage": "done",
  "responses": {
    "p1": "...",
    "p2": "..."
  },
  "crossCheck": {
    "agreements": ["..."],
    "conflicts": ["..."],
    "missing": ["..."]
  },
  "errors": []
}
```

Behavior rules:

- Manual participants are skipped from generation, not treated as fatal error.
- Partial success is valid (`ok: true`, non-empty errors).
- If no auto-runnable participants, return `ok: false`, `error: no_runnable_participants`.

### 5.4 POST app/api/brainstorm/synthesize/route.js

Purpose:

- Final synthesis from collected responses.

Request schema:

```json
{
  "question": "...",
  "mode": "synthesis",
  "responses": [{ "participantId": "p1", "name": "Claude", "text": "..." }],
  "provider": "ollama",
  "model": "gemma2",
  "format": "decision_brief"
}
```

Response schema:

```json
{
  "ok": true,
  "synthesis": "final synthesis text",
  "highlights": {
    "agreements": ["..."],
    "risks": ["..."],
    "nextSteps": ["..."]
  }
}
```

## 6. Reducer contract (authoritative)

Action payloads:

```js
{
  type: ("START_ROUND_RUN", total);
}
{
  type: ("SET_RUN_STAGE", stage);
}
{
  type: ("SET_PARTICIPANT_RUNNING", participantId);
}
{
  type: ("SET_PARTICIPANT_DONE", participantId, latencyMs);
}
{
  type: ("SET_PARTICIPANT_ERROR", participantId, error);
}
{
  type: "FINISH_ROUND_RUN";
}
{
  type: ("FAIL_ROUND_RUN", error);
}
{
  type: "RESET_RUN_META";
}
```

State transition rules:

- `START_ROUND_RUN` allowed only from idle/done/failed.
- `NEW_ROUND` denied while `runMeta.status === 'running'`.
- `FAIL_ROUND_RUN` preserves partial participant results.

## 7. Error handling policy

User-facing error map (examples):

- `ollama_unreachable` -> "Ollama не запущений. Запусти: OLLAMA_ORIGINS=\* ollama serve"
- `model_not_found` -> "Модель не знайдена. Запусти: ollama pull {model}"
- `timeout` -> "Модель відповідає занадто довго. Спробуй легшу модель"
- `no_runnable_participants` -> "Додай хоча б одного auto-учасника (Ollama або API)"

Technical details stay in server logs only.

## 8. Rollout plan

Phase 1 (stability):

- Controlled textarea
- round-aware card key
- runMeta in reducer

Phase 2 (API foundation):

- /api/health/ollama
- /api/ai/generate
- UI switched from direct fetch to route handlers

Phase 3 (automation):

- /api/brainstorm/run-round
- /api/brainstorm/synthesize
- one-click auto-round + auto-synthesis

## 9. Acceptance criteria

1. User can run full brainstorm with one click in simple mode.
2. Round switching never displays stale text from another round.
3. Per-participant run status is visible and understandable.
4. Partial generation failures do not destroy successful outputs.
5. Synthesis block can be filled automatically from API result.
