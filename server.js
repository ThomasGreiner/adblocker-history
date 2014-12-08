#!/usr/bin/env node

var fs = require("fs");
var handlebars = require("handlebars");

var startYear = 2002;
var endYear = 2016;
var startDate = new Date(startYear, 1, 1);

function dateToX(date) {
  var date = new Date(date);
  var year = date.getFullYear();
  var month = date.getMonth();
  var day = date.getDate();
  var lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  var x = 0;
  x += (year - startYear) * 120;
  x += month * 10;
  x += ((day / lastDayOfMonth) * 10) >> 0;
  return x;
}

function onRequest(req, resp) {
  // initialize
  var data = fs.readFileSync("adblockers.json", "utf-8");
  data = data.replace(/\n\s+\/\/.*\n/g, "\n");
  data = JSON.parse(data);
  var adblockers = data.adblockers;
  var trees = data.trees;

  var template = fs.readFileSync("template.svg", "utf-8");
  template = handlebars.compile(template);

  var css = fs.readFileSync("history.css", "utf-8");
  
  // stylesheet
  if (req.url == "/history.css") {
    resp.writeHead(200, {"Content-Type": "text/css"});
    resp.end(css);
    return;
  }
  
  resp.writeHead(200, {"Content-Type": "image/svg+xml"});
  
  var data = {
    width: (endYear - startYear) * 120,
    height: (adblockers.length) * 50 + 100,
    years: [],
    adblockers: []
  };
  
  // initialize years
  for (var i = startYear; i < endYear; i++) {
    data.years.push({
      x: (i - startYear) * 120,
      year: i
    });
  }
  
  // initialize adblockers
  var y = 0;
  data.adblockers = adblockers.map(function(adblocker) {
    if (adblocker.releases.length == 0)
      return;
    
    var releases = adblocker.releases.map(function(release) {
      var version = release[1].replace(/\.0/, "");
      return {
        date: release[0],
        isLongVersion: version.length > 4,
        isSubversion: !/^\d+$/.test(version),
        version: version,
        x: dateToX(release[0])
      };
    });
    
    var base = false;
    if (adblocker.base) {
      var b = adblocker.base;
      var ydiff = 0;
      var isAbove;
      var found = 0;
      b = adblockers.filter(function(a) {
        if (found == 0) {
          if (a.id == adblocker.id) {
            isAbove = false;
            found = 1;
          } else if (a.id == b) {
            isAbove = true;
            found = 1;
          }
        } else if (found == 1) {
          if (a.id == adblocker.id || a.id == b) {
            found = 2;
          } else {
            ydiff++;
          }
        }
        return a.id == b;
      });
      
      if (b.length == 1) {
        b = b[0];
        base = {
          name: b.name,
          ydiff: (ydiff + 1) * (isAbove ? -50 : 50)
        };
      }
    }
    
    return {
      id: adblocker.id,
      base: base,
      name: adblocker.name,
      link: adblocker.link,
      source: adblocker.source,
      color: adblocker.color || "#888",
      started: adblocker.started,
      ended: adblocker.ended,
      x: releases[0].x - 20,
      xmin: adblocker.started && dateToX(adblocker.started) || releases[0].x,
      xmax: adblocker.ended && dateToX(adblocker.ended) || releases[releases.length - 1].x,
      y: (y += 50),
      releases: releases
    };
  });
  
  try {
    resp.end(template(data));
  } catch(ex) {
    console.error(ex);
  }
}

require("http").createServer(onRequest).listen(8080);
