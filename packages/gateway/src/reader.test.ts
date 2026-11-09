import { describe, expect, it } from "vitest";
import { ReaderLineParser } from "./reader.js";

describe("USB reader input", () => {
  it("extracts a credential when the reader emits a newline-terminated line", () => {
    const parser = new ReaderLineParser();
    expect(parser.push("EM4100-ABC\n")).toEqual(["EM4100-ABC"]);
  });

  it("buffers partial keyboard-emulation input", () => {
    const parser = new ReaderLineParser();
    expect(parser.push("EM4100-")).toEqual([]);
    expect(parser.push("ABC\r")).toEqual(["EM4100-ABC"]);
  });
});
