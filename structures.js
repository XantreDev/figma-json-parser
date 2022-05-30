import prettier from "prettier";
import { Transform } from "./transform.js";

export class CSSStructure {
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
    const css = `:root{\n    ${this.#variables.join(
      "\n"
    )}\n}\n\n${this.#classes.join("\n\n")}`;
    return prettier.format(css, {
      parser: "css",
    });
  };

  get length() {
    return this.#variables.length + this.#classes.length;
  }
}