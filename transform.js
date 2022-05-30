import { CSS_COLOR_VARIABLE_DIGITS_SUFFIX, PROPERTIES_IN_PX } from './constants.js'

const getType = (str) =>
  str.includes("#") || str.includes("rgba") ? "color" : "measure";

export class Transform {
  /**
   *
   * @param {string} text
   * @returns {string}
   */

  static fromCebabCaseToPascalCase = (text) =>
    text?.[0]?.toUpperCase() +
    text.slice(1).replaceAll(/-\w/g, (v) => v[1].toUpperCase());

  static toCebabCase = (text) =>
    text.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

  static fromPathToCebabCase = (text) =>
    this.toCebabCase(text.replaceAll(/\./g, "-"));

  static toSnakeCase =
    /**
     * @param {string} path
     */
    (path) => path.replace(/-\w/, (part) => part[1].toUpperCase());
  static toCssVar = (path, value) =>
    `--${this.fromPathToCebabCase(path)}: ${value};`;

  static toReferenceToCssVar = (path) =>
    `var(--${this.fromPathToCebabCase(
      path
    )}-${CSS_COLOR_VARIABLE_DIGITS_SUFFIX})`;

  static hexToDecimal = (hex) => parseInt(hex, 16);

  static #cutHex = (hex) => {
    const peaces = [];
    while (hex) {
      peaces.push(hex.slice(0, 2));
      hex = hex.slice(2);
    }
    return peaces;
  };

  /**
   *
   * @param {string} hex
   * @returns
   */
  static #hexToAlpha = (alpha) =>
    (Transform.hexToDecimal(alpha) / 255).toFixed(4);
  static #hexWithoutAlphaToRgba = (hex) =>
    `rgba(${Transform.#cutHex(hex).map(this.hexToDecimal).join(", ")})`;

  static #hexWithAlphaToRgba = (hex, alpha) =>
    `rgba(${Transform.#cutHex(hex)
      .map(this.hexToDecimal)
      .join(", ")},${Transform.#hexToAlpha(alpha)})`;

  static hexWithoutAlphaToRgbaWithoutFunction = (hex) =>
    `${Transform.#cutHex(hex.slice(1)).map(this.hexToDecimal).join(", ")}`;

  static hexToRgba = (hex) =>
    hex.length === 9
      ? Transform.#hexWithAlphaToRgba(hex.slice(1, -2), hex.slice(-2))
      : Transform.#hexWithoutAlphaToRgba(hex);

  static hexWithRefToRgba = (ref, alpha = "ff") =>
    `rgba(${ref}, ${this.#hexToAlpha(alpha)})`;

  static toCssProperty = (name, value) => {
    const propertyName = Transform.toCebabCase(name);
    if (PROPERTIES_IN_PX.has(propertyName)) value += "px";
    return `${propertyName}: ${value};`;
  };

  static pasteWithSpacesAsPx = (arr) =>
    arr.map((v) => (getType(v) === "color" ? v : `${v}px`)).join(" ");

  static toPx = (text) => `${text}px`;

  /**
   *
   * @param {string} text
   * @returns
   */
  static addPxSuffix = (text) => (/^[\d\.]+$/.test(text) ? `${text}px` : text);

  static toCssClass = (name, value) =>
    `.${name} {\n${" ".repeat(4)}${value}\n}`;

  static getPath = (path, suffix) =>
    path.length ? `${path}.${suffix}` : suffix;

  static applyToEveryProperty = (obj, f) =>
    Object.entries(obj).reduce(
      (prev, [key, value]) => ({ ...prev, [key]: f(value) }),
      {}
    );

  /**
   *
   * @template T
   * @param {T} obj
   * @param {Array<keyof T>} exclude
   * @returns
   */
  static excludeSome = (obj, exclude) =>
    Object.fromEntries(
      Object.entries(obj).filter(([key]) => !exclude.includes(key))
    );
}