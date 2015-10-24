#!/usr/bin/env node

"use strict";

const fs = require("fs");
const svg = require("./lib/svg");

const filepath = "res/adblocker-history.svg";

svg.getSVG((svg) => {
  fs.writeFile(filepath, svg, {encoding: "utf-8"}, (err) => {
    if (err) {
      console.error(err.toString());
    } else {
      console.log(`Successfully wrote data to ${filepath}`);
    }
  });
});
