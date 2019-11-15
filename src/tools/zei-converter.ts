import BSHParser from "../parsers/BSH/bsh-parser";
import Stream from "../parsers/stream";
import BitmapFontGenerator from "../parsers/ZEI/bitmap-font-generator";
import * as fs from "fs";
import * as path from "path";

const args = process.argv;
if (args.length !== 4) {
  console.error(
    "Please provide the input path to a .zei file as well as the output directory"
  );
  process.exit(1);
}

const inFilePath = args[2];
const outDirPath = args[3];
if (!inFilePath.toLowerCase().endsWith(".zei")) {
  console.error("File extension must be .zei!");
  process.exit(1);
}
if (!fs.existsSync(inFilePath)) {
  console.error(`${inFilePath} does not exist.`);
  process.exit(1);
}
if (!fs.existsSync(outDirPath)) {
  console.error(`${outDirPath} does not exist.`);
  process.exit(1);
}

console.info(`Converting ${inFilePath}`);

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  const data = new Stream(fs.readFileSync(inFilePath));
  const fontName = path.basename(inFilePath, path.extname(inFilePath));

  const bshParser = new BSHParser();
  const bitmapFontGenerator = new BitmapFontGenerator();

  const images = await bshParser.decodeZEI(data);
  const sheets = bshParser.createSpriteSheets(fontName, images);

  const font = await bitmapFontGenerator.createBitmapFont(sheets, fontName);

  fs.writeFileSync(`${outDirPath}/font.xml`, font);
  sheets.forEach((sheet, i) => {
    fs.writeFileSync(`${outDirPath}/sheet-${i}.png`, Buffer.from(sheet.png));
  });
  images.forEach((image, i) => {
    fs.writeFileSync(
      `${outDirPath}/glyph-${i}.png`,
      Buffer.from(image.toPNG())
    );
  });
})();
