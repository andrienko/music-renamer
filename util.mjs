import fs from "fs";
import Confirm from "prompt-confirm";
import mv from "mv";
import rm from "rimraf";
import chalk from "chalk";

export const getFolderData = async (parentFolder) => {
  const contents = await fs.promises.readdir(parentFolder, {
    withFileTypes: true,
  });
  const data = {
    dirs: [],
    files: [],
    isEmpty: false,
    hasOnlyOneDir: false,
    entries: [],
  };
  contents.forEach((file) => {
    if (file.isDirectory()) {
      data.dirs.push(file.name);
    } else {
      data.files.push(file.name);
    }
  });
  data.isEmpty = !data.files.length && !data.dirs.length;
  data.entries = contents;
  data.hasOnlyOneDir = !data.files.length && data.dirs.length === 1;
  return data;
};

export const confirm = async (message) => {
  const prompt = new Confirm({
    name: Math.random().toString(16).slice(2),
    message,
  });
  return await prompt.run();
};

export const moveFolder = (from, to, mkdirp = false) =>
  new Promise((resolve) => {
    mv(from, to, { mkdirp, clobber: false }, (err) => {
      if (err) {
        console.log(
          `Could not move ${chalk.yellow(from)} to ${chalk.green(to)}`
        );
        console.error(err);
        resolve(err);
      }
      resolve();
    });
  });

export const removeFolder = (from) =>
  new Promise((resolve) => rm(from, resolve));
