import { z } from "zod";
import type { OcrAnswer } from "../reading/reading.types.js";

export const OCR_ANSWER_SCHEMA = z.object({
  odometerFound: z.boolean(),
  whichNumberClear: z.boolean(),
  digits: z.string(),
  otherPossibleReadings: z.array(z.string()),
  unitShown: z.enum(["miles", "km", "none"]),
  tripMeterOnly: z.boolean(),
}) satisfies z.ZodType<OcrAnswer>;
