# Odometer Reading Service — Domain

Status: stories approved 2026-10-14.

## 1. Brief

> A TypeScript HTTP service that reads the mileage from a photo of a car odometer.
>
> Upload a JPEG or PNG of an odometer and get back the reading, its unit and a confidence level, or a clear error when the image can't be read.
>
> - Single endpoint: `POST /odometer/reading`
> - Accepts images as `multipart/form-data` or as Base64 in a JSON body
> - Supports JPEG and PNG
> - Structured JSON responses for both successful reads and errors
> - Pluggable OCR provider, with a mock mode that needs no credentials
> - Written in strict TypeScript and covered by tests

Source: `README.md`, verbatim. The README also fixes four of the error codes used below. D5, D13 and D19 add three more.

**Hard rule:** never return a wrong number. When unsure, return an error, not a guess. (D6)

**Scope:** an internal processing service on a private network. It keeps no state. Upstream stores readings. (D1)

## 2. User stories

Actors:

```
client     a system or person that sends a photo and wants the mileage back
developer  runs the service locally, with no OCR account
```

Sample images used as concrete values:

```
img-A  33c24909…jpeg  "111 MILES TO E" above "62690.5 mi"            sharp
img-B  d621e37e…jpeg  "104 miles" above "1545 10 miles"              blurred
img-C  dbab9932…jpeg  "ODO 205265", speedo dial 0-140 MPH around it  sharp, no unit beside ODO
img-D  3ae9d173…jpeg  clock "8:31" above "ODO 161967"                sharp, no unit shown
```

---

### S1. Read the mileage from an uploaded photo

As a client, I want to upload an odometer photo as a file, so that I get the mileage without typing it.

| Given | When | Then |
| --- | --- | --- |
| img-A as JPEG | `POST /odometer/reading`, multipart field `image` | 200, `reading` 62690.5, `unit` `miles`, `confidence` `high` |
| img-D as JPEG | same | 200, `reading` 161967 |

### S2. Read the mileage from a Base64 image

As a client, I want to send the photo as Base64 in JSON, so that I can call the service without multipart support.

| Given | When | Then |
| --- | --- | --- |
| img-A, Base64-encoded | `POST /odometer/reading`, body `{"image":"<base64>"}` | same body as S1 for img-A |
| img-A, Base64 with prefix `data:image/jpeg;base64,` | same | same body as S1 for img-A (D4) |

### S3. Ignore other numbers on the dashboard

As a client, I want only the odometer value back, so that I never store the fuel range, clock or speed scale as mileage.

| Given | When | Then |
| --- | --- | --- |
| img-A: range "111" and odo "62690.5" | read | `reading` 62690.5, never 111 |
| img-B: range "104" and odo "1545 10" | read | `reading` is never 104 |
| img-C: dial marks 20…140 and odo "205265" | read | `reading` 205265 |
| img-D: clock "8:31" and odo "161967" | read | `reading` 161967, never 831 |
| a photo showing only "TRIP 831.4", no odometer | read | 422, `UNREADABLE_IMAGE` (D7) |

### S4. Report the unit of the reading

As a client, I want the unit with the reading, so that I do not mix miles and kilometres.

| Given | When | Then |
| --- | --- | --- |
| img-A shows "mi" | read | `unit` `miles` |
| img-B shows "miles" | read | `unit` `miles` |
| an odometer showing "km" | read | `unit` `km` |
| img-D shows no unit | read | `unit` `unknown` (D9) |
| img-C: no unit beside ODO, dial shows MPH and km/h | read | `unit` `unknown`, never guessed from the dial (D9) |

### S5. Flag a reading the service is unsure of

As a client, I want a confidence level, so that I can ask a human to check doubtful readings.

| Given | When | Then |
| --- | --- | --- |
| img-A, sharp | read | `confidence` `high` |
| img-B, blurred, "1545 10" could be 15451.0 or 154510 | read | 200, `confidence` `low` (D10, D11) |

`confidence` is about reading this photo. It does not say whether the value fits the vehicle. A response shows `low` or `high`. Digits that cannot be read return 422. `low` means the photo is blurred, or a digit could be read another way. (D10, D11)

### S6. Get a clear error when no mileage can be found

As a client, I want a clear error when the photo has no readable odometer, so that I do not receive a guessed number.

| Given | When | Then |
| --- | --- | --- |
| a JPEG of a blank wall | read | 422, `error` `UNREADABLE_IMAGE` |
| digits found, but the service cannot tell which number is the odometer | read | 422, `UNREADABLE_IMAGE`, never a guess (D6) |

### S7. Get an error when no image is sent

As a client, I want an error when I forget the image, so that I can fix my request.

| Given | When | Then |
| --- | --- | --- |
| multipart body with no `image` field | `POST /odometer/reading` | 400, `MISSING_IMAGE` |
| JSON body `{}` | same | 400, `MISSING_IMAGE` |

### S8. Get an error for a file type that is not supported

As a client, I want an error for a non-JPEG/PNG file, so that I know which formats are accepted.

| Given | When | Then |
| --- | --- | --- |
| a GIF, or a PDF, as `image` | `POST /odometer/reading` | 415, `UNSUPPORTED_TYPE` |
| a HEIC photo from an iPhone | same | 415, `UNSUPPORTED_TYPE` (D4) |
| a GIF named `photo.jpg`, sent as `image/jpeg` | same | 415, `UNSUPPORTED_TYPE` (D4) |
| a PNG sent as `image/jpeg` | same | not rejected for type (D4) |

### S9. Get an error for a malformed request

As a client, I want an error for a broken body, so that I can tell my bug from an unreadable photo.

| Given | When | Then |
| --- | --- | --- |
| JSON body `{"image": "%%%not-base64"}` | `POST /odometer/reading` | 400, `INVALID_REQUEST` |
| body `{"image": ` (cut off) | same | 400, `INVALID_REQUEST` |
| raw JPEG body, `Content-Type: image/jpeg` | same | 400, `INVALID_REQUEST` (D18) |

### S10. Run the service without an OCR account

As a developer, I want a mock OCR mode, so that I can run and test the service end to end with no credentials.

| Given | When | Then |
| --- | --- | --- |
| `OCR_PROVIDER` unset | `npm run dev`, then read img-A | 200, a well-formed success body |
| `OCR_PROVIDER` unset | start the service | log shows `OCR provider: mock` (D17) |
| no Node installed | `docker compose up`, then read img-A | 200, as in mock mode (D20) |
| `OCR_PROVIDER=mock` | `npm test` | runs with no network and no credentials |
| `OCR_PROVIDER=openai`, no `OPENAI_API_KEY` | `npm run dev` | does not start. The error names `OPENAI_API_KEY` (D17) |
| `OCR_PROVIDER=foo` | `npm run dev` | does not start. The error names `OCR_PROVIDER` (D17) |
| mock mode, each sample in `images/` | read | the fixed result for that sample (D14) |
| mock mode, a photo that is not a sample | read | 422, `UNREADABLE_IMAGE` (D14) |

### S11. Get an error when the image is too large

As a client, I want an error for an oversized image, so that I know to send a smaller photo.

| Given | When | Then |
| --- | --- | --- |
| limit at default 10 MB, a 12 MB JPEG as `image` | `POST /odometer/reading` | 413, `IMAGE_TOO_LARGE` (D5) |
| limit at default 10 MB, a 4 MB JPEG | same | not rejected for size |
| limit set to 5 MB in config, a 6 MB JPEG | same | 413, `IMAGE_TOO_LARGE` |

### S12. Get an error when the OCR service is down

As a client, I want a clear error when the service cannot read photos right now, so that I retry instead of treating my photo as unreadable.

| Given | When | Then |
| --- | --- | --- |
| OCR provider returns a server error | read img-A | 503, `OCR_UNAVAILABLE` (D13) |
| timeout at default 10 s, provider answers after 12 s | read img-A | 503, `OCR_UNAVAILABLE` (D13) |
| the AI model refuses, or its answer is broken | read img-A | 503, `OCR_UNAVAILABLE` (D19) |
| OCR provider is back | read img-A again | 200, as in S1 |

---

## Assumptions

- A1. One photo per request. One reading per response.
- A2. The request carries only the image. There are no extra parameters. (D9)

## 3. Constraints

**Invariants: none.** An invariant is a condition about stored state that is always true. This service keeps no state (D1).

Its constraints protect an invariant that lives upstream:

> A vehicle's stored mileage is a true reading.

| # | Constraint | Tested by, e.g. | From |
| --- | --- | --- | --- |
| C1 | **Nothing is guessed.** Every value returned, number and unit, is read from the photo. | unclear digit → 422. No unit shown → `unknown` | S4, S6, D6, D9 |
| C2 | **Mileage is the car's total distance.** Never another number on the dashboard. | img-A returns 62690.5, never the range 111. Trip only → 422 | S3, D7 |
| C3 | **Doubt is never hidden.** A reading that could be wrong is marked for a check. | blurred img-B → `low` | S5, D10, D11 |
| C4 | **The caller always knows what to do next:** fix the request, retake the photo, or retry later. | 400 / 413 / 415 → fix. 422 → retake. 503 → retry | S7-S9, S11, S12, D19 |
| C5 | **Nothing is kept.** Photos and readings are not stored or logged. | the log line has no reading | D1, D16 |

The brief's hard rule, "never return a wrong number", is C1 + C3: a wrong number may only reach the caller marked `low`.

## 4. Domain model

### Words used

| Word | Meaning |
| --- | --- |
| photo | One JPEG or PNG of a dashboard, sent by a client |
| odometer | The display of the car's total distance |
| reading | The odometer value read from a photo, up to one decimal |
| unit | `miles`, `km`, or `unknown` when the photo shows none |
| confidence | `high`, or `low` when the reading could be wrong |
| blurred | A photo below the sharpness cut-off |
| trip meter | A display of distance since reset. Never a reading |
| OCR provider | The service that reads the photo. OpenAI, or mock |
| upstream | The system that calls us and stores readings |

### Contexts

| Context | Owns | Asks | Copies |
| --- | --- | --- | --- |
| Reading (this service) | C1-C5 | OCR provider, on every request | nothing |
| Upstream (not ours) | the vehicle, its mileage history, the invariant above | this service | the reading, after checking a `low` one |
| OCR provider (not ours) | reading text from an image | nothing | nothing. Kept up to 30 days by OpenAI (D12) |

Asking the OCR provider ties us to its uptime: provider down means 503 (D13).

### Aggregates, tables, events

**None.** Nothing is stored (D1). A request is one photo in, one response out. A reading lives in that response only, and upstream stores it.

## Open items

| Item | Waits for |
| --- | --- |
| Confirm the OCR provider: OpenAI vs one other (D12) | Test on sample photos |
| Collect and label 20-30 photos for the harness (D15) | Team |
| Tune the blur cut-off (D11) | Labelled photos (D15) |
| Tune size limit defaults (D5) | OCR service choice, real traffic |

## Future considerations

Not in this release (D1):

```
auth           callers are internal, on a private network
rate limits    same reason
storage        upstream stores readings
vehicle id     upstream owns the vehicle record
unit lookup    may be needed if upstream requires a unit (D9)
anyline        odometer-specific OCR, if both D12 candidates fail
local OCR      Tesseract / PaddleOCR, only if photos must stay in our network
provider switch  second provider or LLM gateway, for availability (D13)
```
