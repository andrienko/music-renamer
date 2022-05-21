#!/usr/bin/env node
import minimist from "minimist";
// import '../mrn.mjs';

global.argv = minimist(process.argv.slice(2));

const loadCommand = async (command) => {
  try {
    await import(`../routines/${command}.mjs`);
  } catch (e) {
    console.log(`Command ${command} error`);
    console.error(e);
  }
};

const firstArgument = argv._[0];

if (!firstArgument) {
  import("../routines/mrn.mjs");
} else {
  loadCommand(firstArgument);
}
