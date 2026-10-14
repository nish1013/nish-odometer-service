# Odometer Reading Service — Decisions

Decided 2026-10-14. Stories are in `domain.md`. Exact values are in `technical-notes.md`.

## At a glance

| # | Topic | Decision |
| --- | --- | --- |
| D1 | Scope | Internal service. Stores nothing. |
| D2 | Scope | The reading comes back in the same response. |
| D3 | Scope | Built with Fastify on Node 24. |
| D4 | Input | JPEG and PNG only. HEIC is rejected. |
| D5 | Input | Image size limit in config. Default 10 MB. |
| D6 | Reading | Not sure: return an error, never a guess. |
| D7 | Reading | Only a trip meter in the photo: error. |
| D8 | Reading | Keep tenths: `62690.5`. |
| D9 | Reading | No unit in the photo: `unknown`. |
| D10 | Confidence | Each reading is `low` or `high`. |
| D11 | Confidence | Our code checks for blur. A blurred photo is `low`. |
| D12 | OCR | OpenAI vision for now. Final choice after a test. |
| D13 | OCR | One provider. Down or slower than 10 s: 503. |
| D14 | OCR | Mock mode: sample photos give fixed results. |
| D15 | Quality | Labelled photos test every AI model change. |
| D16 | Quality | Logs hold request facts, never the photo or reading. |
| D17 | Errors | Bad config stops the service at startup. |
| D18 | Errors | A body that is not multipart or JSON: 400. |
| D19 | Errors | Every error is JSON, crashes included. |
| D20 | Running | Docker Compose runs it with no Node install. Mock by default. |

What a caller can get back:

```
200  reading, unit, confidence "high"   sharp photo, every digit clear
200  reading, unit, confidence "low"    blurred, or a digit could be read two ways
400  MISSING_IMAGE, INVALID_REQUEST     the request is wrong
413  IMAGE_TOO_LARGE                    over the size limit
415  UNSUPPORTED_TYPE                   not JPEG or PNG
422  UNREADABLE_IMAGE                   not sure, so no number
503  OCR_UNAVAILABLE                    OCR service down, slow or no answer, try again
404  NOT_FOUND                          wrong path
500  INTERNAL_ERROR                     our bug
```

---

## Scope

### D1. Internal service, stores nothing

**Decided.** A photo goes in, a reading comes out. Only internal services call it, on a private network. Upstream stores the readings.

**Why.**
- One job for one service.
- Storage and vehicle records already belong to upstream.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Read only, store nothing** ✅ | One job. No data to protect at rest | Upstream does storage and history checks |
| Store readings and vehicle ids here | History checks in one place | A second job. Copies upstream data |

**Trade-off we accept.** No login, rate limits or storage in this release. This is safe only while every caller is internal.

### D2. Synchronous API

**Decided.** The reading comes back in the same response. No job id, no polling.

**Why.**
- One read takes 2-5 s. That fits in a normal request.
- An async API needs a job store. That breaks D1.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Synchronous** ✅ | Matches the README. Nothing to store | Caller waits 2-5 s, at most 10 s (D13) |
| Async: job id, then poll or callback | Suits slow or batch work | A job store and a second endpoint |

**Trade-off we accept.** Callers wait for the answer. Revisit for batch uploads, or a provider slower than about 30 s.

### D3. Framework: Fastify

**Decided.** Fastify on Node 24, strict TypeScript.

**Why.** Size limits and request checks are built in.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Fastify** ✅ | Limits and checks built in | Less known than Express |
| Express + multer | Widely known | Limits and checks set up by hand |
| NestJS | Strong structure | Too heavy for one endpoint |

**Trade-off we accept.** A short learning curve for developers who know only Express.

---

## Input

### D4. JPEG and PNG only

**Decided.** Accept JPEG and PNG. We check the file content, not its name or header. Anything else returns 415, iPhone HEIC included. Base64 may start with `data:image/jpeg;base64,`. We remove that part.

**Why.**
- The README fixes JPEG and PNG.
- A file name or header can be wrong. The content cannot.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **JPEG and PNG, checked by content** ✅ | Simple. Matches the README | HEIC users must convert |
| Also accept HEIC and convert it | Fewer rejected iPhone photos | An extra image library. The README changes |
| Trust the header or file name | Less code | A wrong file reaches the OCR service |

**Trade-off we accept.** Some apps must convert HEIC to JPEG. Browser uploads already do.

### D5. Size limit in config

**Decided.** Default limit 10 MB per image. Over it: 413. The limit is set in config.

**Why.** One huge upload must not block the service. A phone photo is about 2-5 MB.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **In config, 10 MB default** ✅ | Safe now, can change later | The default is a common value, not measured |
| Fixed in code | Simpler | The OCR service's own limit may be lower |
| No limit | No photo rejected for size | One upload can block the service |

**Trade-off we accept.** The default may be wrong. We tune it after real traffic.

---

## Reading

### D6. Error over guess

**Decided.** Never return a number we are not sure of. Return 422 when:
- it is not clear which number is the odometer
- a digit cannot be read
- the number is not sensible: negative, more than one decimal place, or above 999,999.9
- the photo is a JPEG or PNG, but it cannot be decoded, for example a cut-off upload

**Why.** A wrong mileage stored upstream does more harm than a failed read. The caller can take a new photo.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Error when not sure** ✅ | No wrong number is stored | Some photos fail |
| Best guess with a warning flag | More photos succeed | Callers may ignore the flag |

**Trade-off we accept.** Fewer successful reads, in return for no wrong ones. Checks against the car's past mileage stay upstream (D1).

### D7. Trip meter only: error

**Decided.** A photo with a trip meter and no odometer returns 422.

**Why.** A trip value is never the total mileage.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **422** ✅ | A trip value is never stored as mileage | Caller takes a new photo |
| Return it with a "trip" flag | No failed read | A field no caller asked for. Easy to store by mistake |

**Trade-off we accept.** The caller takes a new photo.

### D8. Keep tenths

**Decided.** `62690.5` stays `62690.5`.

**Why.** Dropping the tenth loses data. Rounding is the caller's choice.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Keep the tenth** ✅ | Matches the photo | `reading` can be a decimal |
| Drop it, like the README example | Whole numbers only | Loses data |
| Round it | Whole numbers only | Loses data. No longer matches the photo |

**Trade-off we accept.** Callers must handle decimals.

### D9. No unit shown: `unknown`

**Decided.** When the photo shows no unit, `unit` is `unknown`. We never guess from the speedometer. The request carries only the image.

**Why.** Speedometers often show both MPH and km/h. img-C does.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **`unknown`** ✅ | Never a wrong unit | Callers must handle `unknown` |
| Guess from the speedometer | Always a unit | Often wrong |
| Caller sends the unit | Always a unit | The request takes more than the image |
| 422 when no unit | Never `unknown` | img-C and img-D fail, though the reading is right |

**Trade-off we accept.** Callers handle `unknown`. Revisit if upstream needs a unit and has no other source for it.

---

## Confidence

### D10. Confidence: `low` or `high`

**Decided.** Each reading comes with `low` or `high`. `low` means the photo is blurred, or a digit could be read two ways. It is about this photo only, not about the car.

**Why.**
- Upstream knows the car's last mileage. It can check a `low` reading before storing it.
- The AI model never admits doubt (D11). We need a signal we measure ourselves.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **`low` / `high`** ✅ | Simple. Upstream knows when to check | Some correct readings get checked anyway |
| `low` / `medium` / `high` | Finer | Upstream treats `low` and `medium` the same |
| The AI model's own score | No extra work | Not reliable. Differs by provider |
| No confidence | Simplest | Every doubtful photo fails, even ones upstream could confirm |
| This service checks the car's history | Better confidence | Breaks D1. Needs a call to another service |

**Trade-off we accept.** Upstream does a little extra checking. In return, no doubtful reading is stored unchecked.

### D11. Blur check in our code

**Decided.** Before calling the OCR service, our code measures how sharp the photo is. A blurred photo gets `low` at best. The cut-off is in config.

**Why.**
- In our test, the AI model read the blurred photo (img-B) with full certainty. The reading may be wrong.
- Sharpness is easy to measure. With our code, sharp samples scored 133 and up. img-B scored 11. The cut-off is 40.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Blur check in our code** ✅ | Caught img-B. Free. Same for every provider | Checks the whole photo, not only the odometer |
| The AI model lists other possible readings | No extra work | Listed none for img-B. Kept as a second signal |
| The AI model's token probabilities | Measured, not self-reported | 1.000 on img-B |
| Read twice and compare | Catches an unsure AI model | Same answer 4 times on img-B |
| Two providers vote | A real second opinion | Double the cost and setup |

**Trade-off we accept.** A sharp photo with only the odometer blurred may still pass as `high`. The cut-off is measured in the build, then tuned with more labelled photos (D15).

---

## OCR service

### D12. OpenAI vision, for now

**Decided.** Use an OpenAI vision model (`gpt-4.1-mini`). It answers in a fixed shape. Our code decides the response from that answer, never the AI model (D6, D10). Photos may go to OpenAI on standard terms: no training on them, kept up to 30 days for abuse checks.

**Why.**
- We have access today.
- In every test it picked the odometer over the clock, range and speedometer numbers.
- It sits behind a provider interface, so we can swap it.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **OpenAI vision** ✅ | Access today. Picks the right number | Photos leave our network. Shows no doubt (D11) |
| Google Vision | Strong text reading | Returns every number. We must write rules to find the odometer |
| Anyline, built for odometers | Made for this job | Commercial. A new vendor |
| Tesseract / PaddleOCR, run locally | Photos stay in our network | Weak on LCD digits like img-D |

**Trade-off we accept.** Photos leave our network. The choice is not final: before release, the harness compares OpenAI with one other provider (D15).

### D13. One provider, 10 s timeout

**Decided.** One OCR provider, no backup. If it is down, or gives no answer in 10 s, we return 503. Upstream retries. Our service does not.

**Why.**
- The service is internal. A failed read is cheap, and upstream can retry.
- One read takes 2-5 s, so 10 s leaves room for a slow call.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **One provider** ✅ | Simple. One provider to test | Provider down means we are down |
| A second provider as backup | Higher availability | Must pass the same tests, or `low` / `high` change meaning |
| An LLM gateway (OpenRouter, LiteLLM) | Switching happens outside our code | Same testing cost. One more part to fail |
| **10 s timeout** ✅ | Room for a slow call | Rare 503 on a very slow call |
| 20 s timeout | Fewer 503s | Caller waits longer when the provider hangs |
| 5 s timeout | Fails fast | More 503s on slow calls |
| Retry inside our service | Hides short failures | Upstream retries too. The waits add up |

**Trade-off we accept.** A provider outage is our outage. Revisit when outages pass an agreed limit, or a company LLM gateway exists.

### D14. Mock mode

**Decided.** With `OCR_PROVIDER=mock`, each sample photo in `images/` returns a fixed result. Any other photo returns 422. No network, no key.

**Why.** Developers and tests can see every outcome on real photos, with no OCR account.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Fixed result per sample** ✅ | Every outcome. Same result every run | Fixed results must match the sample files |
| One reading for every photo | Simplest | Shows only the success path |
| Random results | None worth having | Tests do not repeat |

**Trade-off we accept.** The 4 samples cover `high`, `low`, `unknown` unit and 422. Other errors are tested with made-up requests.

---

## Quality

### D15. Test harness on labelled photos

**Decided.** A script runs the real OCR service over labelled photos and reports the results. Every change of AI model, provider or prompt goes through it before release. One wrong number returned as `high` blocks the release.

**Why.**
- The AI model cannot tell us when it is wrong (D11). Only labelled photos can.
- The same photo set compares providers fairly (D12).
- First run found a fault: the AI model took "miles" from the speedometer on img-C, against D9. The prompt now says to take the unit only from beside the odometer, and img-C returns `unknown`.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Run by hand, before each release** ✅ | Catches AI model mistakes. A fair comparison | Needs a key. Small cost per run. Someone must label photos |
| Run on every push | Always up to date | Cost on every push. A key in CI |
| Mock tests only | Free and fast | Never tests the real AI model |

**Trade-off we accept.** The team must label 20-30 photos: blurred, km, trip only, night, glare. The harness stays outside `npm test`, so unit tests stay free and offline.

### D16. Logging: request facts only

**Decided.** One log line per request: status, error code, confidence, blur score, OCR time, AI model, image type and size. Never the photo or the reading.

**Why.**
- Enough to tune the blur cut-off and spot provider problems.
- The reading is vehicle data. Upstream owns it (D1).

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Request facts only** ✅ | Useful. No vehicle data | Cannot check readings from logs |
| Also log the reading | Easier tuning | Vehicle data copied into logs |
| Status only | Least data | Nothing to tune with |

**Trade-off we accept.** Tuning on real photos uses the harness (D15), not logs.

---

## Errors and config

### D17. Bad config stops the service at startup

**Decided.** The service checks its config when it starts.

| Config | Result |
| --- | --- |
| `OCR_PROVIDER` unset | Starts in mock mode |
| `OCR_PROVIDER=openai`, no `OPENAI_API_KEY` | Does not start. The error names `OPENAI_API_KEY` |
| `OCR_PROVIDER=foo` | Does not start. The error names `OCR_PROVIDER` |

On start it logs the provider in use, e.g. `OCR provider: mock`.

**Why.** A broken config shows up at deploy time, not on a caller's request.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Fail at startup** ✅ | Found at deploy time | The service is down until the config is fixed |
| Start, then 503 on each request | The service stays up | Every request fails. Looks like an OCR outage |
| Fall back to mock | Always starts | Every real photo returns 422. Looks like bad photos, not bad config |

**Trade-off we accept.** A bad deploy fails at once, before any caller sees it.

### D18. Body not multipart or JSON: 400

**Decided.** A body that is neither multipart nor JSON returns 400 `INVALID_REQUEST`. Example: a raw JPEG sent as `image/jpeg`.

**Why.** 415 means the image is not JPEG or PNG (D4). Here the request itself is wrong.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **400 `INVALID_REQUEST`** ✅ | 415 keeps one meaning | Differs from the usual HTTP habit |
| 415 `UNSUPPORTED_TYPE` | The usual HTTP code for a wrong body type | Caller cannot tell a wrong request from a wrong image |
| Accept raw image bodies | One more way to send | Not in the README. One more code path |

**Trade-off we accept.** We differ from the usual HTTP habit, so each code has one meaning.

### D19. Every error is JSON

**Decided.** Every error uses the shape `{ "error", "message" }`:
- an unexpected crash returns 500 `INTERNAL_ERROR`
- a wrong path returns 404 `NOT_FOUND`
- an AI model refusal or a broken AI model answer returns 503 `OCR_UNAVAILABLE`

**Why.** The README promises JSON for every error. Callers parse one shape.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **One JSON shape for all errors** ✅ | Callers handle one shape | More codes to document |
| Framework's default error pages | No code to write | A different shape. Caller parsing breaks |
| AI model refusal as 422 | No pointless retry | A provider problem looks like a bad photo |

**Trade-off we accept.** On an AI model refusal, upstream may retry the same photo and fail again. Retries stay few, since our service does not retry (D13).

---

## Running

### D20. Docker Compose

**Decided.** Add a Dockerfile and `compose.yaml`. `docker compose up` starts the service on port 3000 in mock mode. `OCR_PROVIDER` and `OPENAI_API_KEY` pass through from the shell. `npm run dev` stays the main path.

**Why.** Anyone can run the service with no Node install and no account.

**Alternatives.**

| Option | Gain | Cost |
| --- | --- | --- |
| **Dockerfile + Compose** ✅ | One command, no Node needed | Two more files. One more setup path to keep working |
| npm only | Fewer files | Running it needs Node 24 installed |

**Trade-off we accept.** Two setup paths to keep working. Tests run through npm only.
