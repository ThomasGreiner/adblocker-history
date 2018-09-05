"use strict";

const fs = require("fs");
const handlebars = require("handlebars");
const path = require("path");
const {promisify} = require("util");

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

const getFilepath = (...parts) => path.join("data", ...parts);

async function getJson(filepath) {
  let content = await readFile(filepath, "utf-8");
  content = content.replace(/\n\s+\/\/[^\n]*\n/g, "\n");
  return JSON.parse(content);
}

async function getData(name) {
  let data = Object.create(null);
  
  try {
    data = await getJson(getFilepath(`${name}.json`));
  } catch(ex) {
    const filenames = await readDir(getFilepath(name));
    for (const filename of filenames) {
      const partial = await getJson(getFilepath(name, filename));
      Object.assign(data, partial);
    }
  }
  
  return data;
}
exports.get = getData;

async function getTemplate() {
  const content = await readFile("template.svg", "utf-8");
  return handlebars.compile(content);
}
exports.getTemplate = getTemplate;
