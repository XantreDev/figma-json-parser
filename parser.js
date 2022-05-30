const fs = require("fs");
const prettier = require("prettier");

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

const FONT_WEIGHTS = {
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

const FONT_WEIGHT_SET = new Set(Object.keys(FONT_WEIGHTS));

const PROPERTIES_IN_PX = new Set(["font-size", "line-height"]);

const TYPE = {
  TYPOGRAPHY: "typography",
  BOX_SHADOW: "boxShadow",
};

const getType = (str) => (str.includes("#") ? "color" : "measure");

class Transform {
  /**
   *
   * @param {string} text
   * @returns {string}
   */

  static toCebabCase = (text) =>
    text.replaceAll(/[A-Z]/, (letter) => `-${letter.toLowerCase()}`);

  static fromPathToCebabCase = (text) =>
    this.toCebabCase(text.replaceAll(/\./g, "-"));

  static toSnakeCase =
    /**
     * @param {string} path
     */
    (path) => path.replace(/-\w/, (part) => part[1].toUpperCase());
  static toCssVar = (path, value) =>
    `--${this.fromPathToCebabCase(path)}: ${value};`;

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
  static addSuffix = (text) => (/^[\d\.]+$/.test(text) ? `${text}px` : text);

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
   * @param {T  } obj
   * @param {Array<keyof T>} exclude
   * @returns
   */
  static excludeSome = (obj, exclude) =>
    Object.fromEntries(
      Object.entries(obj).filter(([key]) => !exclude.includes(key))
    );
}

class CSSStructure {
  #variables;
  #classes;

  constructor() {
    this.#variables = [];
    this.#classes = [];
  }

  addVarable = (path, text) =>
    this.#variables.push(Transform.toCssVar(path, text));

  addClass = (path, text) =>
    this.#classes.push(
      Transform.toCssClass(Transform.fromPathToCebabCase(path), text)
    );

  getResult = () => {
    const r = prettier.format(
      `:root{\n    ${this.#variables.join("\n")}\n}\n\n${this.#classes.join(
        "\n\n"
      )}`,
      {
        parser: "css",
        tabWidth: 4,
      }
    );
    return r;
  };

  get length() {
    return this.#variables.length + this.#classes.length;
  }
}

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
      this.#result.addVarable(path, Transform.addSuffix(text));
      return;
    }
  };

  /**
   *
   * @param {string} keys
   */
  #getValue = (keys) => keys.split(".").reduce((obj, key) => obj[key], theme);

  #getParsedValue = (key) => {
    console.log(key);
    const value = this.#getValue(key);

    return this.#parse(value);
  };

  #parse = (readed) => {
    if (readed?.type === TYPE.TYPOGRAPHY) {
      return this.#parseTypography(readed.value);
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
          this.#parseSimple(v.color),
        ])
      )
      .join(", ");
  };

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
