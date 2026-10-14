# Odometer Reading Service

A TypeScript HTTP service that reads the mileage from a photo of a car odometer.

Upload a JPEG or PNG of an odometer and get back the reading, its unit and a confidence level, or a clear error when the image can't be read.

---

## Features

- Single endpoint: `POST /odometer/reading`
- Accepts images as `multipart/form-data` or as Base64 in a JSON body
- Supports JPEG and PNG
- Structured JSON responses for both successful reads and errors
- Pluggable OCR provider, with a mock mode that needs no credentials
- Written in strict TypeScript and covered by tests

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

The service starts on `http://localhost:3000`.

### Test

```bash
npm test
```

---

## Configuration

| Variable       | Default | Description                                      |
| -------------- | ------- | ------------------------------------------------ |
| `PORT`         | `3000`  | Port the service listens on                      |
| `OCR_PROVIDER` | `mock`  | OCR backend to use (`mock` or a real provider)   |

In `mock` mode the service runs end to end without any external account. Configure a real provider's credentials through environment variables to use live OCR.

---

## API

### `POST /odometer/reading`

#### Multipart upload

```bash
curl -X POST http://localhost:3000/odometer/reading \
  -F "image=@images/33c24909-e9dd-46d3-8e7f-c44fd9896537.jpeg"
```

#### Base64 JSON

```bash
curl -X POST http://localhost:3000/odometer/reading \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64-encoded-image>"}'
```

#### Success response

```json
{
  "reading": 48253,
  "unit": "miles",
  "confidence": "high"
}
```

#### Error response

```json
{
  "error": "UNREADABLE_IMAGE",
  "message": "Could not extract a mileage reading from the provided image"
}
```

#### Error codes

| Code                 | Status | When                                           |
| -------------------- | ------ | ---------------------------------------------- |
| `MISSING_IMAGE`      | 400    | No image was provided                          |
| `UNSUPPORTED_TYPE`   | 415    | The file is not a JPEG or PNG                  |
| `INVALID_REQUEST`    | 400    | The body is malformed or the Base64 is invalid |
| `UNREADABLE_IMAGE`   | 422    | No mileage reading could be extracted          |

---

## Sample Images

The `images/` folder contains odometer photos you can use to try the service locally.
