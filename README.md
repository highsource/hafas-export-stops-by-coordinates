# hafas-export-stops-by-coordinates

Exports stops from HAFAS by bounding box coordinates.

# Usage

```
const exportStops = require("hafas-export-stops-by-coordinates");

const urlTemplate = "https://www.rmv.de/auskunft/bin/jp/query.exe/dny?performLocating=2&tpl=stop2json&look_stopclass=2147483647&look_minx={minx}&look_miny={miny}&look_maxx={maxx}&look_maxy={maxy}";
const minx = 5;
const miny = 47;
const maxx = 15;
const maxy = 56;
const includeStopIdPrefixes = null;
const excludeStopIdPrefixes = [51, 54, 80, 81, 84, 85, 87, 88];

exportStops(urlTemplate, minx, miny, maxx, maxy, includeStopIdPrefixes, excludeStopIdPrefixes);
```

Parameters:

* `urlTemplate` - template of the `query.exe/dny` HAFAS endpoint. Placeholders `{minx}`, `{miny}`, `{maxx}`, `{maxy}` will be replaced with bounding box coordinates.
* `minx`, `miny`, `maxx`, `maxy` - coordinates of the bounding box to start with.
* `excludeStopIdPrefixes` - prefixes of stop ids which should be excluded. Last 5 digits of the stop id will be dropped when comparison. For example `80` matches `8004009`.

The script starts from the provided bounding box and requests stops. If no stops are returned or if the result is too large (more that 200 stops), the bounding box is divided into four smaller equal bounding boxes which are recursively queried in turn. This is repeated until the query produces adequate results or the bounding box gets too small (less that 0.25 in both dimensions).

The script roduces CSV output in the following format:

```
"stop_id","stop_name","stop_lon","stop_lat","stop_code"
"9900088","P+R Seulberg",8.646032,50.241988,""
```

Results are written to the standard output.

# Disclaimer

Usage of this script may or may not be legal, use on your own risk.  
This repository provides only source code, no data.

# License

Source code is licensed under [BSD 2-clause license](LICENSE). No license and no guarantees implied on the produced data, produce and use on your own risk.