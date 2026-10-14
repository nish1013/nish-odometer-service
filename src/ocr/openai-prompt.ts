export const OPENAI_PROMPT = `You read the odometer in a photo of a car dashboard.
The odometer shows the car's total distance. Fill every field of the answer.

odometerFound: true only if an odometer value is visible.
tripMeterOnly: true if the only distance shown is a trip meter (TRIP, TRIP A, TRIP B), with no odometer.
whichNumberClear: false if more than one number could be the odometer and you cannot tell which.
  Ignore fuel range, outside temperature, clock, speed and the marks on the speedometer dial.
digits: the odometer value exactly as shown. Use digits and at most one "." for a tenths digit.
  Write "?" for any digit you cannot read. Do not round, drop or invent digits.
  If odometerFound is false, write "".
otherPossibleReadings: other ways the same odometer digits could be read, for example a gap
  that may be a decimal point, or a digit that may be another digit. Empty if there are none.
unitShown: "miles" or "km" only if that unit is printed next to the odometer value
  (for example "mi", "miles", "km"). Otherwise "none".
  Never take the unit from the speedometer dial, MPH, km/h, or the range display.`;
