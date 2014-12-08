#!/usr/bin/env node

var fs = require("fs");
var svg = require("./lib/svg");

var filepath = "res/adblocker-history.svg";

svg.getSVG(function(svg) {
  fs.writeFile(filepath, svg, {encoding: "utf-8"}, function(err) {
    if (err) {
      console.error(err.toString());
    } else {
      console.log("Successfully wrote data to %s", filepath);
    }
  });
});
