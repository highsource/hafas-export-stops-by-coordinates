const exportStops = require("./index.js");

const urlTemplate = "https://www.rmv.de/auskunft/bin/jp/query.exe/dny?performLocating=2&tpl=stop2json&look_stopclass=2147483647&look_minx={minx}&look_miny={miny}&look_maxx={maxx}&look_maxy={maxy}";
const minx = 5;
const miny = 47;
const maxx = 15;
const maxy = 56;

exportStops(urlTemplate, minx, miny, maxx, maxy);