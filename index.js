const got = require('got');
const csv = require('csv');
const leftPad = require('left-pad');
const iconvlite = require('iconv-lite');

const EPSILON = Math.pow(2, -2);
const MAX_STOPS = 200;

const parseJSON = function(body) {
	try {
		return JSON.parse(body);
	}
	catch(error) {
		const expression = 'var _result =' + body + ';';
		eval(expression);
		var result = _result;
		delete _result;
		return result;
	}
}

const queryStops = function(urlTemplate, encoding, minx, miny, maxx, maxy) {
	const url = urlTemplate
		.replace("{minx}", Math.round(minx * 1000000))
		.replace("{miny}", Math.round(miny * 1000000))
		.replace("{maxx}", Math.round(maxx * 1000000))
		.replace("{maxy}", Math.round(maxy * 1000000));

	return new Promise(function(resolve, reject){
		got(url, {encoding: null})
		.then(response => {
			const content = iconvlite.decode(response.body, encoding || 'UTF-8'); 
			const result = parseJSON(content);
			// console.log("Got " + result.stops.length + " results from " + url + ".");
			const smallestAllowedBoundingBox = Math.max(maxx - minx, maxy - miny) <= EPSILON;
			if (result.stops.length > 0 && (result.stops.length < MAX_STOPS || smallestAllowedBoundingBox)) {
				resolve(result.stops);
			} else if (!smallestAllowedBoundingBox)
			{
				subqueryStops(urlTemplate, encoding, minx, miny, maxx, maxy).then(resolve).catch(reject);
			} else {
				resolve([]);
			}
		})
		.catch(error => {
			// console.log("Error querying " + url + ", requerying.");
			subqueryStops(urlTemplate, encoding, minx, miny, maxx, maxy).then(resolve).catch(reject);
		});
	});
};

const subqueryStops = function(urlTemplate, encoding, minx, miny, maxx, maxy) {

	return new Promise(function(resolve, reject){
		const midx = (minx + maxx) / 2;
		const midy = (miny + maxy) / 2;
		Promise
		.all([
			queryStops(urlTemplate, encoding, minx, miny, midx, midy),
			queryStops(urlTemplate, encoding, midx, miny, maxx, midy),
			queryStops(urlTemplate, encoding, minx, midy, midx, maxy),
			queryStops(urlTemplate, encoding, midx, midy, maxx, maxy)
		])
		.then(results => resolve([].concat.apply([], results)))
		.catch(reject);
	});
};

const convertStops = function(stops) {
	return stops.map(convertStop);
};

const convertStop = function(s) {
	const stopId = s.extId;
	const stop = {
		stop_id: stopId,
		stop_name: s.name,
		stop_lon: Number(s.x/1000000),
		stop_lat: Number(s.y/1000000),
		stop_code: ""
	};
	return stop;
};

const removeStopsWithoutCoordinates = function(stops) {
	return stops.filter(stop => stop.stop_lon && stop.stop_lat);
};

const removeDuplicateStops = function(stops) {
	const filteredStops = [];
	const stopsById = {};

	stops.forEach(stop => {
		const existingStop = stopsById[stop.stop_id];
		if (existingStop) {
			if (	stop.stop_id !== existingStop.stop_id ||
				stop.stop_name !== existingStop.stop_name ||
				stop.stop_lon !== existingStop.stop_lon ||
				stop.stop_lat !== existingStop.stop_lat)
			{
				// console.log("Duplicate but different stop.");
				// console.log("Existing stop:", existingStop);
				// console.log("Duplicate stop:", stop);
			}
		}
		else {
			stopsById[stop.stop_id] = stop;
			filteredStops.push(stop);
		}
	});
	return filteredStops;
};

const retainStopsWithStopIdPrefixes = function(stopIdPrefixes) {
	if (stopIdPrefixes) {
		const stopIdPrefixMap = stopIdPrefixes.reduce((stopIdPrefixMap, stopIdPrefix) => Object.assign(stopIdPrefixMap, { [stopIdPrefix]: true }), {});
		return stops => stops.filter(
			stop => {
				const stopIdPrefix = Number(stop.stop_id) / 100000;
				return stopIdPrefixMap[stopIdPrefix];
			}
		);
	}
	else {
		return stops => stops;
	}
};

const removeStopsWithStopIdPrefixes = function(stopIdPrefixes) {
	if (stopIdPrefixes) {
		const stopIdPrefixMap = stopIdPrefixes.reduce((stopIdPrefixMap, stopIdPrefix) => Object.assign(stopIdPrefixMap, { [stopIdPrefix]: true }), {});
		return stops => stops.filter(
			stop => {
				const stopIdPrefix = Math.floor(Number(stop.stop_id) / 100000);
				return !stopIdPrefixMap[stopIdPrefix];
			}
		);
	}
	else {
		return stops => stops;
	}
};

const sortStops = function(stops) {
	return stops.sort((s1, s2) => s1.stop_id < s2.stop_id);
};

const outputStops = function(stops) {
	csv.stringify(stops, {header: true, quotedString: true, columns: ["stop_id", "stop_name", "stop_lon", "stop_lat", "stop_code"]}, function(err, data){
		process.stdout.write(data);
	});
}

const exportStops = function(urlTemplate, encoding, minx, miny, maxx, maxy, includeStopIdPrefixes, excludeStopIdPrefixes)  {
	queryStops(urlTemplate, encoding, minx, miny, maxx, maxy)
	.then(convertStops)
	.then(removeStopsWithoutCoordinates)
	.then(removeDuplicateStops)
	.then(retainStopsWithStopIdPrefixes(includeStopIdPrefixes))
	.then(removeStopsWithStopIdPrefixes(excludeStopIdPrefixes))
	.then(sortStops)
	.then(outputStops)
	.catch(error => console.log(error));
};

module.exports = exportStops;