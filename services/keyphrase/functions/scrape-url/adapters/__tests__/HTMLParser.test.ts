import path from "path";
import { PathOrFileDescriptor, readFileSync } from "fs-extra";

import HTMLParser from "../HTMLParser";

const ASSET_FOLDER = path.join(__dirname, "/assets/");

function readFile(filePath: PathOrFileDescriptor) {
    return readFileSync(filePath).toString();
}

const parser = new HTMLParser();

test("returns all text found within body", () => {
    const html = readFile(path.join(ASSET_FOLDER, "text.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("Test Text");
});

test("returns all text without any added whitespace between words", () => {
    const html = readFile(path.join(ASSET_FOLDER, "whitespace.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("Added Whitespace Between Words");
});

test("returns all text found within body with no new lines", () => {
    const html = readFile(path.join(ASSET_FOLDER, "newlines.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("Test 1 Test 2 Test 3");
});

test("returns all text found within body without any tabs", () => {
    const html = readFile(path.join(ASSET_FOLDER, "tabs.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("Test Text");
});

test("returns nothing if html contains no text", () => {
    const html = readFile(path.join(ASSET_FOLDER, "empty.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("");
});

test.each([
    ["script", "script.html"],
    ["style", "style.html"],
    ["comment", "comment.html"],
])("returns text outside of %s elements", (elementType, fileName) => {
    const html = readFile(path.join(ASSET_FOLDER, fileName));

    const result = parser.parseHTML(html);

    expect(result).toEqual("This is actual text!");
});

test("returns text with structure respected given multiple paragraphs", () => {
    const html = readFile(path.join(ASSET_FOLDER, "multi-paragraph.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual(
        "First paragraph\n\nSecond paragraph\n\nThird paragraph"
    );
});

test("ignores href of any links in page", () => {
    const html = readFile(path.join(ASSET_FOLDER, "link.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("Ignores href text");
});

test("ignores src of any image on page", () => {
    const html = readFile(path.join(ASSET_FOLDER, "image-source.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("Ignores image source");
});

test("adds no text if no image alt available", () => {
    const html = readFile(path.join(ASSET_FOLDER, "no-image-alt.html"));

    const result = parser.parseHTML(html);

    expect(result).toEqual("No image alt provided");
});
