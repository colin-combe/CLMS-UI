/*jslint browser: true, white: true, stupid: true, vars: true*/
var has_require = typeof require !== 'undefined';
if (has_require) {
	d3 = require ("../vendor/js/d3.js");
}

!function() {
	var d3Table = function () {
		var data = [], filteredData = [], filter = [];
		var orderKey = null;
		var orderDirs = ["asc", "desc"];
		var rotates = [0, 180];
		var orderDir = orderDirs[0];
		var page = 0;
		var pageSize = 20;
		var columnOrder = ["key1", "key2"];
		var selection = null;
		var postUpdate = null;
		var preExit = null;
		var dataToHTMLModifiers = {};
		var pageCount = 1;
		var dispatch, cellStyles, tooltips, cellD3Hooks;

		var d3v3 = d3.version[0] === "3";

		var preprocessFilterInputFuncs = {
			alpha: function (filterVal) {
				// Strings split by spaces and entries must later match all substrings: As asked for by lutz and worked in the old table - issue 139
				var parts = filterVal ? filterVal.split(" ").map (function (part) { return "(?=.*"+part+")"; }) : [];
				return new RegExp (parts.length > 1 ? parts.join("") : filterVal, "i");
			},
			numeric: function (filterVal) { return filterVal ? filterVal.split(" ").map (function (part) { return Number(part); }) : filterVal; },
			boolean: function (filterVal) { return toBoolean (filterVal); },
		}

		var filterByTypeFuncs = {
			alpha: function (datum, regex) { return regex.test(datum) > 0; /* return datum.search(regex) >= 0; */ },
			numeric: function (datum, range) { return range.length <= 1 ? +datum === range[0] : (datum >= range[0] && datum <= range[1]); },
			boolean: function (datum, bool) { return toBoolean (datum, true) === bool; }													   
		};

		var comparators = {
			alpha: function (a, b) { return a.localeCompare(b); },
			numeric: function (a, b) { return a - b; },
			boolean: function (a, b) { 
				var aBool = toBoolean(a); 
				return aBool === toBoolean(b) ? 0 : (aBool ? 1 : -1); 
			}
		};

		var cache = {};

		function toBoolean (val, nullIsFalse) {
			return (val === "1" || val === "t" || val === "true" || val === true) ? true : ((val === "0" || val === "f" || val === "false" || val === false || (val === null && nullIsFalse)) ? false : null);
		}

		function my (mySelection) {	// data in selection should be 2d-array [[]]
			selection = mySelection;
			data = selection.datum().data;
			filteredData = data;
			columnOrder = selection.datum().columnOrder;

			if (selection.select("table").empty()) {
				var controls = selection.append("div").attr("class", "d3tableControls d3table-pagerInfo");
				var pageInfo = controls.append("span")
					.attr("class", "d3table-pageInfo")
				;
				pageInfo.append("span")
					.attr("class", "d3table-pageInput")
					.append ("input")
						.attr("type", "number")
						.attr("length", 3)
						.attr("min", 1)
						.attr ("value", 1)
						.on ("input", function () {
							var val = d3.select(this).property("value");
							doPageCount();
							if (val !== "") {
								val = Math.max (Math.min (val, pageCount), 1);
								my.page(val).update();
							}
							//d3.select(this).property("value", val);
						})
				;
				pageInfo.append("span").attr("class", "d3table-pageTotal");

				var table = selection.append("table").attr("class", "d3table");
				table.append("thead").selectAll("tr").data([0,1]).enter().append("tr");
				table.append("tbody");
			}

			var headerEntries = selection.datum().headerEntries;
			cellStyles = selection.datum().cellStyles || {};
			tooltips = selection.datum().tooltips || {};
			cellD3Hooks = selection.datum().cellD3Hooks || {};

			var headerCells = selection.select("thead tr:first-child").selectAll("th").data(headerEntries);
			headerCells.exit().remove();
			var enterHeaderCells = headerCells.enter().append("th");
			enterHeaderCells.append("span");

			if (!d3v3) { headerCells = enterHeaderCells.merge (headerCells); }

			headerCells.each (function (d) {
				d3.select(this).select("span")
					.text (d.value.name)
					.attr ("title", d.value.tooltip)
				;
			});

			buildHeaders (headerEntries);
			hideFilters();

			doPageCount();

			function setPageWidget (page) {
				selection.select(".d3table-pageInput input[type='number']").property ("value", page);
			};

			function setOrderButton (key) {
				var order = orderDirs.indexOf (orderDir);
				var rotate = rotates[order];
				selection.selectAll("svg.d3table-arrow")
					.style ("transform", null).classed("d3table-active", false)
					.filter (function (d) { return d.key === key; })
					.style ("transform", "rotate("+rotate+"deg)").classed("d3table-active", true)
				;
			};

			dispatch = d3.dispatch ("columnHiding", "filtering", "ordering", "ordering2", "pageNumbering");
			dispatch.on ("pageNumbering", setPageWidget);
			dispatch.on ("ordering2", setOrderButton);

			//console.log ("data", data, filteredData);
		}

		function dispatchWrapper (type, valueArray) {
			d3v3 ? dispatch[type].apply(this, valueArray) : dispatch.apply (type, this, valueArray);
		}

		function buildHeaders (headerEntries) {
			var filterCells = selection.select("thead tr:nth-child(2)").selectAll("th").data(headerEntries);
			filterCells.exit().remove();
			var enterFilterCells = filterCells.enter()
				.append("th")
			;

			if (!d3v3) { filterCells = enterFilterCells.merge (filterCells); }

			filterCells
				.each (function () {
					var filterHeader = d3.select(this).append("div").attr("class", "d3table-flex-header");
					filterHeader.append("input")
						.attr("class", "d3table-filterInput")
						.attr("type", "text")
						//.property("value", function(d) { return filter[d.value.id].value; })
						.on ("input", function (d) {
							var filter = my.filter();
							filter[d.key].value = d3.select(this).property("value");
							my.filter(filter).update();
						})
					;
					filterHeader.append("svg").attr("class", "d3table-arrow")
						.on ("click", function (d) {
							my.orderKey(d.key).sort();
							dispatchWrapper ("ordering2", [d.key]);
							my.update();
						})
						.append ("svg:path")
							.attr ("d", "M7.5 4 L 13.5 10 L 1.5 10 Z")
					;
				})
			;
		}

		function hideFilters () {
			var passTypes = d3.set(d3.keys(filterByTypeFuncs));
			selection.select("thead tr:nth-child(2)").selectAll("th > div")
				.style ("display", function (d) { return passTypes.has (d.value.type) ? null : "none"; })
			;
		}

		function doPageCount () {
			pageCount = Math.max (1, Math.ceil (filteredData.length / my.pageSize()));
			return pageCount;
		}

		// helper function for next bit
		function displayColumn (columnIndex, show) {
			selection.selectAll("td:nth-child("+columnIndex+"), th:nth-child("+columnIndex+")").style("display", show ? null : "none");
		}

		function hideColumns () {
			// hide columns that are hid by default
			selection.datum().headerEntries.forEach (function (d, i) {
				if (!d.value.visible) {
					displayColumn (i + 1, false);
				}
			});
		}

		my.update = function () {
			var pageData = filteredData.slice ((page - 1) * pageSize, page * pageSize);
			var ko = this.columnOrder();
			var modifiers = this.dataToHTML();

			selection.selectAll(".d3table-pageTotal").text(pageCount);

			var rows = selection.select("tbody").selectAll("tr").data(pageData);

			if (this.preExit()) {
				this.preExit()(rows.exit());
			}
			rows.exit().remove();

			var enterRows = rows.enter().append("tr");

			if (!d3v3) { rows = enterRows.merge(rows); }

			var cells = rows.selectAll("td").data (function (d) { return ko.map (function (k) { return {key: k, value: d}; }); });
			var enterCells = cells.enter().append("td");

			if (!d3v3) { cells = enterCells.merge(cells); }

			cells
				.html (function(d) { return modifiers[d.key] ? modifiers[d.key](d.value) : d.value[d.key]; })
				.attr ("class", function(d) { return cellStyles[d.key]; })
			;

			cells
				.filter (function(d) { return tooltips[d.key]; })
				.attr ("title", function(d) {
					var v = tooltips[d.key](d);
					return v ? v : "";
				})
			;	

			cells
				.filter (function (d) { return cellD3Hooks[d.key]; })
				.each (function(d) { cellD3Hooks[d.key](d3.select(this)); })
			;

			hideColumns();

			if (this.postUpdate()) {
				this.postUpdate()(rows);
			}
		};

		my.columnOrder = function (value) {
			if (!arguments.length) { return columnOrder; }
			columnOrder = value;
			return my;
		};

		my.dataToHTML = function (value) {
			if (!arguments.length) { return dataToHTMLModifiers; }
			dataToHTMLModifiers = value;
			return my;
		};

		my.typeSettings = function (type, settings) {
			if (!settings) { 
				return { 
					preprocessFunc: preprocessFilterInputFuncs[type],
					filterFunc: filterByTypeFuncs[type],
					comparator: comparators[type],
				};
			}

			preprocessFilterInputFuncs[type] = settings.preprocessFunc;
			filterByTypeFuncs[type] = settings.filterFunc;
			comparators[type] = settings.comparator;

			hideFilters();

			return my;
		},

		my.filter = function (value) {
			if (!arguments.length) { return filter; }
			filter = value;
			var ko = this.columnOrder();

			//console.log ("ff", filter);

			// Parse individual filters by type
			var processedFilterInputs = {};
			ko.forEach (function (key) {
				if (filter[key]) {
					var filterVal = filter[key].value;
					if (filterVal !== null && filterVal !== "") {
						var filterType = filter[key].type;
						var preprocess = preprocessFilterInputFuncs[filterType];
						processedFilterInputs[key] = preprocess ? preprocess.call (this,filterVal) : filterVal;
					}
				}
			}, this);

			var indexedFilterByTypeFuncs = ko.map (function (key) {
				return filter[key] ? filterByTypeFuncs[filter[key].type] : null;
			});

			filteredData = data.filter (function (rowdata) {
				var pass = true;
				for (var n = 0; n < ko.length; n++) {
					var key = ko[n];
					var parsedFilterInput = processedFilterInputs[key];
					if (parsedFilterInput != undefined) {
						// If array
						var datum = rowdata[key];
						if (!indexedFilterByTypeFuncs[n].call (this, datum, parsedFilterInput)) {
							pass = false;
							break;
						}
					}
				}
				return pass;
			}, this);

			this.sort();

			doPageCount();
			my.page(1);

			// update filter inputs with new filters
			var filterCells = this.getFilterCells();
			filterCells.select("input").property("value", function (d) {
				return filter[d.key] ? filter[d.key].value : "";	
			});

			var filter2 = selection.datum().headerEntries.map (function (hentry) {
				return {value: filter[hentry.key] ? filter[hentry.key].value : null};
			});
			dispatchWrapper ("filtering", [filter2]);

			return my;
		};

		my.refilter = function () {
			this.filter (this.filter());
			return my;
		};

		my.sort = function () {
			var orderKey = my.orderKey();
			var orderDir = my.orderDir();

			var comparator = orderKey ? comparators[filter[orderKey].type] : null;

			if (orderDir !== "none" && comparator) {
				var mult = (orderDir === "asc" ? 1 : -1);
				var context = this;

				filteredData.sort (function (a, b) {
					var aval = a[orderKey];
					var bval = b[orderKey];
					var bnone = bval === undefined || bval === null;
					if (aval === undefined || aval === null) {
						return bnone ? 0 : -mult;
					}
					else {
						return bnone ? mult : mult * comparator.call (context, aval, bval);
					}
				});
			}

			return my;
		};

		my.orderKey = function (value) {
			if (!arguments.length) { return orderKey; }
			if (value !== orderKey) {
				orderKey = value;
				orderDir = "asc";
			} else {
				var index = orderDirs.indexOf(orderDir);
				orderDir = orderDirs[(index + 1) % orderDirs.length];
			}

			dispatchWrapper ("ordering", [my.getColumnIndex(orderKey), orderDir === "desc"]);
			dispatchWrapper ("ordering2", [orderKey]);

			return my;
		};

		my.orderDir = function (value) {
			if (!arguments.length) { return orderDir; }
			if (orderDirs.indexOf (orderDir) >= 0) {
				orderDir = value;
			}

			dispatchWrapper ("ordering", [my.getColumnIndex(orderKey), orderDir === "desc"]);
			dispatchWrapper ("ordering2", [orderKey]);

			return my;
		}

		my.page = function (value) {
			if (!arguments.length) { return page; }
			page = value;

			dispatchWrapper ("pageNumbering", [page]);

			return my;
		};

		my.pageSize = function (value) {
			if (!arguments.length) { return pageSize; }
			pageSize = value;
			doPageCount();
			return my;
		};

		/* What to do, if anything, to rows after update */
		my.postUpdate = function (value) {
			if (!arguments.length) { return postUpdate; }
			postUpdate = value;
			return my;
		};

		/* What to do if anything, to rows that are exiting (useful if they hold objects that need disposed nicely) */
		my.preExit = function (value) {
			if (!arguments.length) { return preExit; }
			preExit = value;
			return my;
		};

		my.getColumnIndex = function (key) {
			return my.columnOrder().indexOf(key);	
		};

		my.getFilteredSize = function () {
			return filteredData.length;	
		};

		my.getData = function () {
			return selection.datum().data;
		};

		my.getAllRowsSelection = function () {
			return selection.selectAll("tbody tr");
		};

		my.getHeaderCells = function () {
			return selection.select("thead tr:first-child").selectAll("th")
		};

		my.getFilterCells = function () {
			return selection.select("thead tr:nth-child(2)").selectAll("th")
		};

		my.showHeaderFilter = function (key, show) {
			this.getFilterCells().selectAll("div")
				.filter (function (d) { return d.key === key; })
				.style ("display", show ? null : "none")
			;	
		};

		// listen to this object to catch filter / sort events
		my.dispatch = function (value) {
			if (!arguments.length) { return dispatch; }
			dispatch = value;
			return my;
		};

		// store long calculations here that can be reused in filtering operations i.e. max / mins / averages
		my.cache = function (setting, value) {
			if (!value) { return cache[setting]; }
			cache[setting] = value;
			return my;
		}

		return my;
	};
	
	if (typeof define === "function" && define.amd) { this.d3Table = d3Table, define(d3Table); }
	else if (typeof module === "object" && module.exports) { 
		module.exports = {d3Table: d3Table}; 
		module.require = ['d3'];
	}
	else { this.CLMSUI = this.CLMSUI || {}; this.CLMSUI.d3Table = d3Table; }
}();
