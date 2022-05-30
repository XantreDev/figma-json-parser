import fs from "fs";
import {
  CSS_COLOR_VARIABLE_DIGITS_SUFFIX,
  FONT_WEIGHTS,
  FONT_WEIGHT_SET,
  PASTE_AS_VAR,
  TYPE,
} from "./constants.js";
import { Transform } from "./transform.js";
import { CSSStructure } from "./structures.js";

const theme = JSON.parse(fs.readFileSync("./theme.json", "utf-8")).global;

/** @typedef {object} BoxShadow
 * @property {string} color
 * @property {string} type
 * @property {string} x
 * @property {string} y
 * @property {string} blur
 * @property {string} spread
 */

/** @typedef {object} Typography
 * @property {string} fontFamily
 * @property {string} fontWeight
 * @property {string} lineHeight
 * @property {string} fontSize
 * @property {string} letterSpacing
 * @property {string} paragraphSpacing
 * @property {string} textCase
 * @property {string} textDecoration
 */

/**
 *
 * @typedef {'typography' | 'boxShadow'} Type
 * @returns
 */

class Parser {
  #data;
  #result;
  #to;

  /**
   *
   * @param {object} data
   * @param {'css' | 'scss'} to
   */
  constructor(data, to = "css") {
    this.#data = data;
    this.#result = to === "css" ? new CSSStructure() : [];
    this.#to = to;
  }

  /**
   * @method
   * @name #reqursiveParse
   * @param {object} obj
   */
  #reqursiveParse = (obj = this.#data, path = "") => {
    Object.entries(obj).forEach(([key, obj]) => {
      const newPath = Transform.getPath(path, key);
      "value" in obj
        ? this.#addValue(newPath)
        : this.#reqursiveParse(obj, newPath);
    });
  };

  write(file) {
    if (this.#result.length === 0) {
      this.#reqursiveParse();
    }
    fs.writeFileSync(file, this.#result.getResult());
  }

  #addValue =
    /**
     *
     * @param {string} value
     * @param {string} type
     * @param {string} path
     * @param {type}
     */
    (path) => {
      const readed = this.#getValue(path);
      const parsed = this.#parse(readed);

      this.#writeAs(parsed, path, readed.type);
    };

  #writeAs = (text, path, type) => {
    if (this.#to === "css") {
      if (type === TYPE.TYPOGRAPHY) {
        this.#result.addClass(path, text);
        return;
      }

      if (type === TYPE.COLOR && !this.#hasRef(text)) {
        this.#result.addVarable(
          path +
            Transform.fromCebabCaseToPascalCase(
              CSS_COLOR_VARIABLE_DIGITS_SUFFIX
            ),
          Transform.hexWithoutAlphaToRgbaWithoutFunction(text)
        );
      }

      this.#result.addVarable(path, Transform.addPxSuffix(text));
      return;
    }
  };

  /**
   *
   * @param {string} keys
   */
  #getValue = (keys) => keys.split(".").reduce((obj, key) => obj[key], theme);

  #getParsedValue = (key) => {
    const value = this.#getValue(key);

    return this.#parse(value);
  };

  #hasRef = (css) => css.includes("var");

  #parse = (readed) => {
    if (readed?.type === TYPE.TYPOGRAPHY) {
      return this.#parseTypography(readed.value);
    }

    if (readed?.type === TYPE.COLOR) {
      return this.#parseColor(readed.value);
    }

    if (readed?.type === TYPE.BOX_SHADOW) {
      return this.#parseShadow(readed.value);
    }

    return this.#parseSimple(readed.value);
  };

  /**
   * @param {BoxShadow[]} value
   */
  #parseShadow = (value) => {
    const boxShadow = value;
    return boxShadow
      .map((v) =>
        Transform.pasteWithSpacesAsPx([
          v.x,
          v.y,
          v.blur,
          v.spread,
          this.#parseColor(v.color),
        ])
      )
      .join(", ");
  };

  /**
   * 
   * @param {boolean} withAlpha 
   * @returns 
   */
  #getReplaceColor = (withAlpha) => (v) => {
    const getPath = () => (withAlpha ? v.slice(1, -3) : v.slice(1, -1));
    const getAlpha = () => (withAlpha ? v.slice(-2) : "ff");

    const newPath = getPath();

    return PASTE_AS_VAR.some((pattern) => RegExp(pattern).test(newPath))
      ? Transform.hexWithRefToRgba(
          Transform.toReferenceToCssVar(newPath),
          getAlpha()
        )
      : Transform.hexToRgba(this.#getParsedValue(newPath) + getAlpha());
  };

  /**
   *
   * @param {string} value
   */
  #parseColor = (value) =>
    value
      .replaceAll(/{.+?}[A-Fa-f0-9]{2}/g, this.#getReplaceColor(true))
      .replaceAll(/{.+?}/g, this.#getReplaceColor(false));

  /**
   *
   * @param {string} value
   * @returns
   */
  #parseSimple = (value) => {
    /**
     * @type {string}
     */
    let result = value.replaceAll(/{.+?}/g, (v) => {
      const newPath = v.slice(1, -1);
      return this.#getParsedValue(newPath);
    });

    if (FONT_WEIGHT_SET.has(result)) {
      return FONT_WEIGHTS[result];
    }

    if (["+", "*", "/"].some((v) => result.includes(v))) {
      result = eval(result);
    }

    return result;
  };

  /**
   *
   * @param {Typography} value
   * @returns
   */
  #parseTypography = (value) => {
    /**
     * @type {Typography}
     */
    const typegraphy = Transform.applyToEveryProperty(
      Transform.excludeSome(value, ["paragraphSpacing", "textCase"]),
      this.#parseSimple
    );
    return Object.entries(typegraphy)
      .map(([key, value]) => Transform.toCssProperty(key, value))
      .join("\n" + " ".repeat(4));
  };
}

const parser = new Parser(theme);

parser.write("result.css");
