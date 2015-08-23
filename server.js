#!/usr/bin/env node

var http = require("http");
var svg = require("./lib/svg");

function onRequest(req, resp) {
  resp.writeHead(200, {"Content-Type": "image/svg+xml"});
  
  svg.getSVG(function(svg) {
    resp.end(svg);
  });
}

http.createServer(onRequest).listen(8080);
console.log("Server started at 127.0.0.1:8080");
