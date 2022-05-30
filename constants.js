export const FONT_WEIGHTS = {
  Thin: 100,
  "Extra Light": 200,
  Light: 300,
  Normal: 400,
  Regular: 400,
  Medium: 500,
  "Semi Bold": 600,
  Bold: 700,
  "Extra Bold": 800,
};

export const CSS_COLOR_VARIABLE_DIGITS_SUFFIX = "digits";

export const FONT_WEIGHT_SET = new Set(Object.keys(FONT_WEIGHTS));

export const PROPERTIES_IN_PX = new Set([
  "font-size",
  "line-height",
  "letter-spacing",
]);

export const PASTE_AS_VAR = ["palette"];

export const TYPE = {
  TYPOGRAPHY: "typography",
  BOX_SHADOW: "boxShadow",
  COLOR: "color",
};
