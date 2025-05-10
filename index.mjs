#!/usr/bin/env node

import { arch, homedir } from "node:os";
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { finished } from "node:stream/promises";
import { Readable } from "node:stream";
import unzipper from "unzipper";
import { spawn } from "node:child_process";

if (process.argv.length != 3) {
  console.log("Usage: npx @na-trium-144/crdl <version>");
  process.exit(1);
}

const baseDir = `${homedir()}/.crdl`;
if (!existsSync(baseDir)) {
  mkdirSync(baseDir);
}

const platform = process.platform + ":" + arch();
let prefix;
let filename;
switch (platform) {
  case "win32:arm64":
    prefix = "Win_Arm64";
    filename = "chrome-win.zip";
    break;
  case "win32:x64":
    prefix = "Win_x64";
    filename = "chrome-win.zip";
    break;
  case "linux:x64":
    prefix = "Linux_x64";
    filename = "chrome-linux.zip";
    break;
  case "darwin:x64":
    prefix = "Mac";
    filename = "chrome-mac.zip";
    break;
  case "darwin:arm64":
    prefix = "Mac_Arm";
    filename = "chrome-mac.zip";
    break;
  default:
    throw new Error(`Unsupported platform: ${platform}`);
}
const dirName = `chromium_${process.argv[2]}_${prefix}`;
if (existsSync(`${baseDir}/${dirName}`)) {
  console.warn(`${dirName} already exists, launching without download`);
} else {
  const res = await fetch(
    "https://chromiumdash.appspot.com/fetch_milestones?only_branched=true",
  );
  if (!res.ok) {
    throw new Error("Failed to fetch milestones: ", res);
  }
  const milestones = await res.json();
  const milestone = milestones.find(
    (m) => m.milestone.toString() === process.argv[2],
  );
  if (!milestone) {
    throw new Error(`Milestone ${process.argv[2]} not found`);
  }
  const position = milestone.chromium_main_branch_position;
  const url = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${prefix}%2F${position}%2F${filename}?alt=media`;
  console.log(`Downloading ${url} ...`);
  let resChromium = await fetch(url);
  if (resChromium.status !== 200 && resChromium.status !== 404) {
    throw new Error("Failed to download chromium:", resChromium);
  }
  for (let offset = 1; offset <= 100 && !resChromium.ok; offset++) {
    const url = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${prefix}%2F${position - offset}%2F${filename}?alt=media`;
    console.log(`Downloading ${url} ...`);
    resChromium = await fetch(url);
    if (resChromium.status !== 200 && resChromium.status !== 404) {
      throw new Error("Failed to download chromium:", resChromium);
    }
    if (!resChromium.ok) {
      const url = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${prefix}%2F${position + offset}%2F${filename}?alt=media`;
      console.log(`Downloading ${url} ...`);
      resChromium = await fetch(url);
      if (resChromium.status !== 200 && resChromium.status !== 404) {
        throw new Error("Failed to download chromium:", resChromium);
      }
    }
  }
  await finished(
    Readable.fromWeb(resChromium.body).pipe(
      createWriteStream(`${baseDir}/${dirName}.zip`, { flags: "wx" }),
    ),
  );
  await (
    await unzipper.Open.file(`${baseDir}/${dirName}.zip`)
  ).extract({ path: `${baseDir}/${dirName}` });
  unlinkSync(`${baseDir}/${dirName}.zip`);
  console.log(
    `Successfully downloaded chromium ${process.argv[2]}. Now launching...`,
  );
}

function chmodRecursive(dir) {
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    if (
      file.isFile() &&
      (file.name.includes(".so") || !file.name.includes("."))
    ) {
      chmodSync(`${dir}/${file.name}`, 0o755);
    } else if (file.isDirectory()) {
      chmodRecursive(`${dir}/${file.name}`);
    }
  }
}
switch (process.platform) {
  case "win32":
    spawn(`${baseDir}/${dirName}/chrome-win/chrome.exe`, [], {
      detached: true,
    });
    break;
  case "linux":
    chmodRecursive(`${baseDir}/${dirName}/chrome-linux/`);
    spawn(`${baseDir}/${dirName}/chrome-linux/chrome`, [], {
      detached: true,
    });
    break;
  case "darwin":
    chmodRecursive(`${baseDir}/${dirName}/chrome-mac/`);
    spawn("open", [`${baseDir}/${dirName}/chrome-mac/Chromium.app`], {
      detached: true,
    });
    break;
}
