# Plan: Odometer Reading Service

Status: locked, 2026-10-14.

A TypeScript HTTP service that reads the mileage from an odometer photo. It runs on Node 24 or in Docker. It is delivered as 4 PRs, each one tested and runnable end to end.

Stories and constraints: `domain.md`. Decisions: `decisions.md`. Exact values: `technical-notes.md`. Request flow: the diagram in `README.md`.

## Context

**The brief.** The original README: one endpoint, multipart or Base64 JSON, JPEG and PNG, JSON responses, a pluggable OCR provider with a mock mode, strict TypeScript, tests.

**Owner's decisions (2026-10-14):** D1-D20 in `decisions.md`. The ones that shape the build:

1. Not sure means 422, never a guess (D6).
2. Confidence is `low` or `high`, set by our rules, not by the AI model (D10, D11).
3. OpenAI `gpt-4.1-mini` for now, behind a provider interface (D12).
4. Nothing is stored. Logs hold request facts only (D1, D16).
5. Mock is the default. Bad config stops the service at startup (D14, D17).

**Facts checked read-only (2026-10-14):**

| Fact | Value |
| --- | --- |
| Node, npm | 24.21.0, 11.19.0 |
| Docker, Compose | 29.2.1, v5.0.2 |
| `gh` | logged in as `nish1013` |
| OpenAI test key | `gpt-4.1-mini` only. `gpt-4.1` returns 403 |
| TypeScript | latest is 7.0.2, but `typescript-eslint` 8.71 supports `<6.1.0`. So pin 6.0.x |
| Repo | not a git repo yet |

## Stack

| Concern | Choice | One-line reason |
| --- | --- | --- |
| Runtime | Node 24 | LTS to April 2028 (D3) |
| Language | TypeScript 6.0, `strict` | The newest version the linter supports |
| HTTP | Fastify 5 | Body and file size limits are settings, not code (D3, D5) |
| Multipart | `@fastify/multipart` | Fastify's own plugin, with a file size limit |
| OCR client | `openai` SDK | Structured output against a schema (D12) |
| AI model answer check | `zod` | Checks the AI model's answer at runtime and gives the TypeScript type from one source |
| Image decode, blur | `sharp` | Native, runs off the event loop, so a 5 MB decode blocks no other request (D2, D11) |
| Tests | Vitest | Runs TypeScript with no build step. HTTP tests use Fastify `inject`, no open port |
| Logs | pino, built into Fastify | One JSON line per request, no extra package (D16) |
| Lint, format | ESLint + `typescript-eslint`, Prettier | Catches unsafe `any` and floating promises |
| Container | `node:24-slim`, multi-stage | `sharp` ships prebuilt binaries for Debian, not Alpine musl |

## Request flow

The full diagram is in `README.md`. In short:

```
body -> image bytes -> size -> type -> blur -> OCR provider -> our rules -> response
        400            413     415             503              422 / 200 low / 200 high
```

## Domain contract

The rule steps are in `technical-notes.md`. Boundary cases the tests assert:

| Input | Result | Why |
| --- | --- | --- |
| digits `62690.5` | 200, `62690.5` | one decimal is allowed (D8) |
| digits `62690.55` | 422 | more than one decimal (D6) |
| digits `0` | 200, `0` | a new car can read 0 |
| digits `-120` | 422 | negative (D6) |
| digits `999999.9` | 200 | at the maximum |
| digits `1000000` | 422 | above the maximum |
| digits `012345` | 200, `12345` | leading zeros are display padding |
| digits `62?90` | 422 | a digit cannot be read (D6) |
| digits `1545 10` | 422 | only digits and one `.` are a reading |
| other readings `["62690.5"]`, same as digits | ignored | the same reading is not doubt |
| other readings `["154510"]` | `low` | a second reading is possible (D10) |
| blur score below the cut-off | `low` | even when the AI model is sure (D11) |
| blur score equal to the cut-off | not blurred | the cut-off is the lowest sharp score |
| unit `none` | `unknown` | never guessed (D9) |

## Validation and responses

| Status | Code | When |
| --- | --- | --- |
| 200 | | reading, unit, confidence |
| 400 | `INVALID_REQUEST` | body not multipart or JSON, broken JSON, bad Base64 (D18) |
| 400 | `MISSING_IMAGE` | no `image` field, or an empty one |
| 404 | `NOT_FOUND` | any other path (D19) |
| 413 | `IMAGE_TOO_LARGE` | image over 10 MB, or JSON body over 14 MB (D5) |
| 415 | `UNSUPPORTED_TYPE` | first bytes are not JPEG or PNG (D4) |
| 422 | `UNREADABLE_IMAGE` | our rules say "not sure" (D6, D7) |
| 500 | `INTERNAL_ERROR` | an unexpected error. The message never carries the stack (D19) |
| 503 | `OCR_UNAVAILABLE` | provider error, over 10 s, refusal, or an answer that fails the schema (D13, D19) |

## Architecture

```
src/
  server.ts                    load config, build app, listen
  app.ts                       buildApp(config, provider): routes, limits, error handler
  config/
    config.ts                  read env, fail on a bad value (D17)
    config.types.ts            AppConfig
  http/
    reading.route.ts           POST /odometer/reading: wiring only
    image-input.ts             multipart or JSON body -> image bytes
    error-handler.ts           any error -> { error, message } (D19)
    api-error.ts               ApiError: status + code
  image/
    image-type.ts              first bytes -> jpeg | png | null (D4)
    blur.ts                    sharpness score with sharp (D11)
  reading/
    reading.types.ts           OcrAnswer, Reading, Unit, Confidence
    reading-rules.ts           decide(answer, blur, limits) -> reading or unreadable. Pure, no I/O
    read-odometer.ts           type -> blur -> provider -> rules
  ocr/
    ocr-provider.ts            interface OcrProvider { read(image): Promise<OcrAnswer> }
    openai-provider.ts         OpenAI call, schema, timeout (D12, D13)
    mock-provider.ts           SHA-256 -> fixed answer (D14)
    mock-fixtures.ts           the 4 sample answers
    ocr-unavailable-error.ts
harness/
  run.ts                       real provider over labelled photos, prints the report (D15)
  labels.json
test/                          unit and HTTP tests, by area
Dockerfile, compose.yaml
```

```
http        reading.route, image-input, error-handler    status codes, request shapes
service     read-odometer                                one request, in order
domain      reading-rules, image-type                    pure rules, no I/O
adapters    ocr/*, blur                                  the outside world
```

**Storage:** none (D1).

## The hard part

**A wrong number returned as `high`.**

- Example: blurred img-B. The AI model returned `154510` in 4 of 4 reads, with no sign of doubt. If the true value is `15451.0`, upstream stores a jump of about 139,000 miles as trusted.
- Simpler options fail. The AI model's own doubt was empty. Token probabilities were 1.000. Reading twice gave the same answer 4 times (D11).
- Guard: the blur check marks img-B `low` before the AI model is asked. The harness blocks a release with even one wrong `high` (D15).
- Proof the guard works: remove the blur check, and the test "blurred photo, sure AI model → `low`" fails.

The blur score depends on image size. `blur.ts` resizes to a fixed width before scoring. The cut-off is measured again with this code in PR 3. The earlier scores (8 vs 514+) came from a test script, so they are not the final values.

## Tests

| Layer | Proves | Examples |
| --- | --- | --- |
| Unit | Every rule and boundary | the domain contract table above. Magic bytes. Config cases (D17) |
| HTTP | Every story row, through the real app with the mock or a fake provider | one test per Given/When/Then row in S1-S12, named by story: `S8 HEIC -> 415` |
| Harness | The real AI model on labelled photos | 0 wrong `high`. img-C `unknown`. img-B `low` |
| Smoke | Docker runs | `docker compose up`, then img-A → 200 |

A fake provider covers what the mock cannot: it hangs (timeout → 503), throws (→ 503), or returns a broken answer (→ 503).

Each test maps to a story and a constraint:

| Constraint | Stories | Key test |
| --- | --- | --- |
| C1 nothing guessed | S4, S6 | `62?90` → 422. Unit `none` → `unknown` |
| C2 total distance only | S3 | trip only → 422 |
| C3 doubt never hidden | S5 | blurred + sure AI model → `low` |
| C4 caller knows what to do | S7-S9, S11, S12 | each error → its own code. 413 and 415 never call the provider |
| C5 nothing kept | D16 | the log line for img-A does not contain `62690.5` |

## README

The top part already exists. PR 4 makes every command in it true, and adds `npm run harness`.

## PR series

1. **`feat/read-with-mock`.** Project setup: TypeScript strict, ESLint, Prettier, Vitest, CI. Config with startup checks. JSON error handler with 404 and 500. Multipart input. Mock provider. Reading rules.
   Stories S1, S3, S4, S5 (other reading), S6, S10.

   **Accept when:**
   - `curl -F image=@<img-A>` returns `{"reading":62690.5,"unit":"miles","confidence":"high"}`.
   - img-B returns `low`. A photo that is not a sample returns 422.
   - `OCR_PROVIDER=foo npm run dev` exits non-zero and names `OCR_PROVIDER`.
   - `GET /nope` returns 404 in the JSON shape.
   - Every row in the domain contract table has a test, except the 2 blur rows (see *Deviations*). Delete the `?` check, and `62?90 → 422` fails.

2. **`feat/input-checks`.** Base64 JSON with data-URL prefix. Missing image. Bad body. Type by first bytes. Size limits.
   Stories S2, S7, S8, S9, S11.

   **Accept when:**
   - Every Given/When/Then row in S2, S7, S8, S9 and S11 has a passing test.
   - A GIF named `photo.jpg` → 415. A PNG sent as `image/jpeg` → 200.
   - A 12 MB image → 413, and the provider spy shows 0 calls.
   - JSON `{}` → `MISSING_IMAGE`, not `INVALID_REQUEST`.

3. **`feat/openai-provider`.** OpenAI provider with structured output and a `zod` schema. Prompt fixed so it never takes the unit from the speedometer. 10 s timeout. Errors, refusals and broken answers → 503. Blur check with `sharp`. Log line. Harness.
   Stories S5 (blur), S12. D11, D15, D16.

   **Accept when:**
   - `npm run harness` on the 4 samples: 0 wrong `high`. img-C unit `unknown`. img-B `low`.
   - The blur cut-off is set from scores measured with `blur.ts`. img-B is below it, all sharp samples are above it.
   - The 2 blur rows of the domain contract table have a test.
   - Remove the blur check, and "blurred, sure AI model → `low`" fails.
   - A fake provider that hangs → 503. The test runs with a 50 ms timeout.
   - The log line for img-A has the fields in D16 and does not contain `62690.5`.

4. **`chore/docker-and-readme`.** Dockerfile, `compose.yaml`, CI Docker build, README commands checked.
   D20.

   **Accept when:**
   - From a fresh clone with only Docker: `docker compose up`, then img-A → 200 `high`.
   - Every command in the README top part runs as written.
   - CI is green on the PR, including the Docker build.

## Execution steps

```
git init -b main; repo-local identity (nish1013, noreply email)
docs commit on main, then docs/odometer-design PR
per PR:  git switch -c <branch> origin/main, then build PR <n> as planned
npm i fastify @fastify/multipart openai sharp zod
npm i -D typescript@~6.0 @types/node vitest eslint typescript-eslint prettier tsx
```

## Verification

```
npm run lint && npm run typecheck && npm test    all green, no network
npm run harness                                  needs OPENAI_API_KEY. 0 wrong high
docker compose up                                then the README curl -> 200
```

Before each push: `git log --format='%an <%ae>%n%b' origin/main..HEAD` shows only `nish1013`, no trailers.

## Out of scope

See *Future considerations* in `domain.md`.

## Deviations

| Date | PR | Change | Why |
| --- | --- | --- | --- |
| 2026-10-14 | 1 → 3 | The 2 blur rows of the domain contract table move from PR 1 to PR 3. In PR 1 the reading rules take no blur input. | Blur is measured from PR 3 on. A blur input in PR 1 would carry a value nobody measured. |
