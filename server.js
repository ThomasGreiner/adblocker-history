#!/usr/bin/env node

var http = require("http");
var svg = require("./lib/svg");

function onRequest(req, resp) {
  if (req.url == "/history.css") {
    svg.getCSS(function(css) {
      resp.writeHead(200, {"Content-Type": "text/css"});
      resp.end(css);
    });
    return;
  }
  
  resp.writeHead(200, {"Content-Type": "image/svg+xml"});
  
  svg.getSVG(function(svg) {
    resp.end(svg);
  });
}

http.createServer(onRequest).listen(8080);
