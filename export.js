#!/usr/bin/env node

"use strict";

const fs = require("fs");
const {create} = require("./lib/svg");

const filepath = "res/adblocker-history.svg";

create().then((svg) => {
  fs.writeFile(filepath, svg, {encoding: "utf-8"}, (err) => {
    if (err) {
      console.error(err.toString());
    } else {
      console.log(`Successfully wrote data to ${filepath}`);
    }
  });
});
