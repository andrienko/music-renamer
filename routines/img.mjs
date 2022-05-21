import { promisify } from "util";
import { promises as fs } from "fs";
import globRaw from "glob";
import Jimp from "jimp";
const glob = promisify(globRaw);

global.argv = global.argv || { _: [] };

const createImage = (x, y) =>
  new Promise((resolve) => new Jimp(x, y, (err, image) => resolve(image)));

const go = async () => {
  let targetWidth = 1024;
  if (argv.width) {
    targetWidth = parseInt(argv.width) || targetWidth;
  }

  let quality = 80;
  if(argv.quality){
    quality = parseInt(argv.quality) || quality;
  }

  let pattern = "**/*.jpg";
  if (argv.pattern) {
    pattern = argv.pattern;
  }

  let targetFileName = "atlas.jpg";
  if (argv.fileName) {
    targetFileName = argv.fileName;
  }

  let maxFileSize = 3 * 1024 * 1024; // 3 mb
  if (argv.maxFileSize) {
    maxFileSize = parseInt(argv.maxFileSize) || maxFileSize;
  }

  let minFileSize = 3 * 1024; // 3 kb
  if (argv.minFileSize) {
    minFileSize = parseInt(argv.minFileSize) || minFileSize;
  }

  console.log(
    `Atlas of ${targetWidth}x${targetWidth}px will be saved to ${targetFileName}`
  );
  console.log(`Looking for files between ${minFileSize} and ${maxFileSize}`);

  const sourceImages = (await glob(pattern))
    .filter((img) => img !== targetFileName)
    .sort(() => Math.random() - 0.5);

  console.log(`Pattern ${pattern} matched ${sourceImages.length} files`);

  const corruptFiles = [];

  let images = [];
  for (const image of sourceImages) {
    try {
      const stats = await fs.stat(image);
      if (stats.size > maxFileSize) {
        console.log(
          `File ${image} is too big (${stats.size} exceeds ${maxFileSize} bytes)`
        );
      }
      if (stats.size < minFileSize) {
        console.log(
          `File ${image} is too small (${stats.size} is less than ${minFileSize} bytes)`
        );
      }
      {
        images.push(image);
      }
    } catch (e) {
      console.log(`Could not read stats for ${image}`);
      corruptFiles.push(image);
    }
  }

  if (images.length) {
    const x = Math.floor(Math.sqrt(images.length));

    const singleWidth = Math.ceil(targetWidth / x);
    const resultWidth = singleWidth * x;

    console.log(`Atlas size: ${resultWidth}, single size: ${singleWidth}`);

    const atlas = await createImage(resultWidth, resultWidth);

    let currentX = 0;
    let currentY = 0;

    let currentIndex = 0;

    if (x * x < images.length) {
      console.log(`${images.length - x * x} images left out`);
    }

    for (const fileName of images) {
      if (currentY > x) {
        break;
      }
      console.log(
        `Processing ${fileName} (${currentIndex} of ${images.length})`
      );
      try {
        const image = await Jimp.read(fileName);
        image.contain(singleWidth, singleWidth);
        atlas.composite(image, currentX * singleWidth, currentY * singleWidth);

        currentX += 1;
        if (currentX >= x) {
          currentX = 0;
          currentY += 1;
        }
      } catch (e) {
        console.log(`Could not load ${fileName}. Is file corrupt?`);
        corruptFiles.push(fileName);
        console.error(e);
      }

      currentIndex++;
    }

    atlas.resize(targetWidth, targetWidth).quality(quality).write(targetFileName);

    if (corruptFiles.length) {
      console.log(`Unprocessed files: ${corruptFiles.join(",")}`);
    }
  }
};

go();
