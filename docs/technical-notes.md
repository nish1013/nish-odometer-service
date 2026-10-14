# Odometer Reading Service — Technical notes

The exact values behind `decisions.md`: rules, limits, config, fixtures and test evidence. Use it as the reference while writing code.

## How a reading is decided

The AI model answers in this shape (D12). It never decides the response.

| Field | Meaning | Example (img-B) |
| --- | --- | --- |
| `odometerFound` | An odometer is visible | `true` |
| `whichNumberClear` | Only one number can be the odometer | `true` |
| `digits` | The odometer as read, `?` for a digit that cannot be read | `"15451.0"` |
| `otherPossibleReadings` | Other ways the digits could be read | `["154510"]` |
| `unitShown` | `miles`, `km` or `none` | `miles` |
| `tripMeterOnly` | Only a trip meter is visible (D7) | `false` |

Rules our code applies, the same for every provider:

| Step | Rule | Result |
| --- | --- | --- |
| Before OCR | Not JPEG / PNG, by first bytes | 415 (D4) |
| Before OCR | Over the size limit | 413 (D5) |
| Before OCR | Blur score under 1: no detail, nothing to read | 422 (D6, D11) |
| Before OCR | Blur score under the cut-off | `low` at most (D11) |
| After OCR | No odometer, or trip meter only | 422 (D6, D7) |
| After OCR | Not clear which number is the odometer | 422 (D6) |
| After OCR | A digit is `?` | 422 (D6) |
| After OCR | Negative, more than 1 decimal place, or over the maximum | 422 (D6) |
| After OCR | Unit not `miles` or `km` | `unknown` (D9) |
| After OCR | AI model lists another reading | `low` (D10) |
| After OCR | None of the above | `high` |

## Input (D4, D5)

```
type check     first bytes: FF D8 FF = JPEG, 89 50 4E 47 = PNG
Base64         strip a leading "data:image/<x>;base64," before decoding
image limit    10 MB, config
JSON limit     14 MB, config (Base64 adds 33%)
max reading    999,999.9, config
```

## Blur check (D11)

- Score: variance of the Laplacian on a greyscale copy, resized to 800 px wide. Cut-off 40, in config.
- Decoded with `sharp`, which runs off the event loop. A pure-JS decoder would block other requests for 100+ ms on a 5 MB photo (D2).
- Resize to a fixed width before scoring, so the score does not depend on photo size.
- A JPEG or PNG that cannot be decoded returns 422 `UNREADABLE_IMAGE`. The OCR provider is not called (D6).

Scores measured with `blur.ts`, 2026-10-14:

| Photo | 400 px | 600 px | **800 px** | 1000 px |
| --- | --- | --- | --- | --- |
| img-A | 1096 | 1149 | **913** | 611 |
| img-B (blurred) | 10 | 12 | **11** | 9 |
| img-C | 850 | 614 | **394** | 251 |
| img-D | 418 | 214 | **133** | 88 |

- 800 px keeps a margin of about 3x on each side of the cut-off: img-B 11, lowest sharp photo 133.
- A smaller width separates these 4 photos more, but shrinking a photo hides mild blur. Missing blur is the unsafe direction (C3).

## OCR call (D12, D13)

```
model     gpt-4.1-mini, structured output
timeout   10 s, config  -> 503 OCR_UNAVAILABLE
retry     none
5xx       -> 503 OCR_UNAVAILABLE
```

## Mock fixtures (D14)

Matched by SHA-256 of the file bytes, not by file name. The mock returns an answer in the AI model's shape. That answer goes through the same blur check and rules as a real one, so mock mode tests our rules too.

| Sample | Mock answer | Response after our rules |
| --- | --- | --- |
| img-A | found, clear, `62690.5`, no others, `miles` | 200 62690.5 miles high |
| img-B | found, clear, `15451.0`, others `["154510"]`, `miles` | 200 15451.0 miles low. Test value only, true reading unknown |
| img-C | found, clear, `205265`, no others, `none` | 200 205265 unknown high |
| img-D | found, clear, `161967`, no others, `none` | 200 161967 unknown high |
| other | not found | 422 UNREADABLE_IMAGE |

## Config

```
PORT              3000
OCR_PROVIDER      mock | openai          unknown value: no start (D17)
OPENAI_API_KEY    needed for openai      missing: no start (D17)
OCR_TIMEOUT_MS    10000
MAX_IMAGE_MB      10
MAX_BODY_MB       14
BLUR_CUTOFF       40
MAX_READING       999999.9
```

## Docker (D20)

```
Dockerfile     node:24-slim, multi-stage, runs the built JS
compose.yaml   port 3000
               OCR_PROVIDER=${OCR_PROVIDER:-mock}
               OPENAI_API_KEY=${OPENAI_API_KEY:-}
```

## Log line (D16)

```
requestId, status, errorCode, confidence, blurScore,
ocrLatencyMs, provider, model, imageType, imageBytes
```

## Test evidence, 2026-10-14

`gpt-4.1-mini`, 4 samples, 4 reads each.

| Photo | Blur score | AI model reading | AI model showed doubt? |
| --- | --- | --- | --- |
| img-A | 727 | 62690.5 | no, correct |
| img-B (blurred) | 8 | 154510 in all 4 reads | no, and may be wrong |
| img-C | 739 | 205265 | no, correct. Took "miles" from the dial, against D9 |
| img-D | 514 | 161967 | no, correct |

- Token probabilities: 1.000 for every digit, img-B included.
- Read-twice: all 4 reads of img-B agreed, with 2 prompts and 2 temperatures.
- Same answer on every run, so the harness results repeat.

## Harness labels (D15)

```
img-A   200  62690.5  miles    high
img-B   200  (any)    miles    low      must not be high
img-C   200  205265   unknown  high
img-D   200  161967   unknown  high
```

| Measure | Bar |
| --- | --- |
| Wrong number returned as `high` | 0. Blocks release |
| Correct reading | reported |
| Correct unit, `unknown` included | reported |
| `low` where expected | reported |
| Readable photo rejected with 422 | reported |
