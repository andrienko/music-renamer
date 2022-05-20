import path from "path";
import chalk from "chalk";

import { getFolderData, confirm, moveFolder, removeFolder } from "./util.mjs";

const getEmptyFolders = async (parentDir) => {
  const emptySubFolderNames = [];

  const currentDirData = await getFolderData(parentDir);
  for (const subDirName of currentDirData.dirs) {
    const subDirFullName = path.join(parentDir, subDirName);
    const subDirData = await getFolderData(subDirFullName);
    if (subDirData.isEmpty) {
      emptySubFolderNames.push(subDirFullName);
    }
  }
  return emptySubFolderNames;
};

const getSubDirRenames = async (parentDir) => {
  const renames = [];

  const folderData = await getFolderData(parentDir);
  for (const subDir of folderData.dirs) {
    const subFolderPath = path.join(parentDir, subDir);
    const subFolderData = await getFolderData(subFolderPath);
    if (subFolderData.hasOnlyOneDir) {
      const onlySubFolderName = subFolderData.dirs[0];
      renames.push({
        from: path.join(parentDir, subFolderPath, onlySubFolderName),
        to: path.join(parentDir, `${subFolderPath} - ${onlySubFolderName}`),
      });
    }
  }
  return renames;
};

const moveChildFolders = async (currentDir) => {
  const renames = await getSubDirRenames(currentDir);

  if (renames.length) {
    console.log(
      `Found ${chalk.white(renames.length)} paths that could be renamed:\n`
    );
    for (const { from, to } of renames) {
      console.log(`${chalk.yellow(from)} -> ${chalk.green(to)}`);
    }

    if (await confirm("Rename the folders above?")) {
      for (const { from, to } of renames) {
        console.log(`Moving ${from} to ${to}`);
        await moveFolder(from, to);
      }
    }
  }
};

const removeEmptyFolders = async (currentDir) => {
  const foldersToDelete = await getEmptyFolders(currentDir);

  if (foldersToDelete.length) {
    console.log(
      `Found ${chalk.white(foldersToDelete.length)} empty folders:\n`
    );
    for (const del of foldersToDelete) {
      console.log(chalk.gray(del));
    }
    if (await confirm("Delete the empty folders listed above?")) {
      for (const folderToDelete of foldersToDelete) {
        await removeFolder(folderToDelete);
      }
    }
  }
};

const folderToArtistAndData = (folder) => {
  const match = folder.match(/(.*) - ([12][0-9][0-9][0-9]) - (.*)/);
  if (match) {
    return {
      full: match[0],
      artist: match[1],
      year: match[2],
      album: match[3],
    };
  }
  return null;
};

const groupByArtist = async (parentDirName) => {
  const dirData = await getFolderData(parentDirName);
  const albumFolderNames = dirData.dirs;
  // {artist: {from: string, withoutArtist: string }}
  const artistToFolder = {};

  albumFolderNames.forEach((folder) => {
    const data = folderToArtistAndData(folder);
    if (data) {
      const toFolderName = `${data.year} - ${data.album}`;
      const folderData = {
        from: folder,
        to: `${data.artist}/${toFolderName}`,
        folderName: toFolderName,
        data,
      };
      artistToFolder[data.artist] = artistToFolder[data.artist] || [];
      artistToFolder[data.artist].push(folderData);
    }
  });

  const artistToFolderWithMoreThanOneAlbum = {};

  for (const artistName in artistToFolder) {
    if (artistToFolder[artistName].length > 1) {
      artistToFolderWithMoreThanOneAlbum[artistName] =
        artistToFolder[artistName];
    }
  }

  const artists = Object.keys(artistToFolderWithMoreThanOneAlbum).length;
  if (artists > 0) {
    console.log(
      `Albums for ${chalk.whiteBright(artists)} artists can be grouped:`
    );

    const filesToMove = [];

    for (const artistName in artistToFolderWithMoreThanOneAlbum) {
      const albums = artistToFolderWithMoreThanOneAlbum[artistName];
      console.log("\n" + chalk.yellowBright(`${artistName}/`));
      for (const album of albums) {
        console.log(`  ${chalk.green(album.folderName)}`);
        console.log(
          chalk.grey(`  ${album.from} ${chalk.yellowBright("->")} ${album.to}`)
        );
        filesToMove.push(album);
      }
    }

    if (await confirm("Group by artist?")) {
      for (const { from, to } of filesToMove) {
        await moveFolder(from, to, true);
      }
    }
  }
};

const run = async (currentDir = "./") => {
  await moveChildFolders(currentDir);
  await groupByArtist(currentDir);
  await removeEmptyFolders(currentDir);
};

run();
