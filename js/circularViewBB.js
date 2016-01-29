//		circular protein crosslink view
//
//		Martin Graham, Colin Combe, Rappsilber Laboratory, 2015


(function(global) {
    "use strict";

    global.CLMSUI = global.CLMSUI || {};
    
    global.CLMSUI.CircularViewBB = global.CLMSUI.utils.BaseFrameView.extend ({
        events: function() {
          var parentEvents = global.CLMSUI.utils.BaseFrameView.prototype.events;
          if(_.isFunction(parentEvents)){
              parentEvents = parentEvents();
          }
          return _.extend({},parentEvents,{});
        },

        initialize: function (viewOptions) {
            global.CLMSUI.CircularViewBB.__super__.initialize.apply (this, arguments);
            
            var defaultOptions = {
                xlabel: "Distance",
                ylabel: "Count",
                seriesNames: ["Cross Links", "Random"],
                scaleOthersTo: "Cross Links",
                chartTitle: "Distogram",
                maxX: 80
            };
            this.options = _.extend(defaultOptions, viewOptions.myOptions);

            this.displayEventName = viewOptions.displayEventName;

            var self = this;

            // this.el is the dom element this should be getting added to, replaces targetDiv
            var mainDivSel = d3.select(this.el);
            
            
            var height = $(this.el).height();
            var width = $(this.el).width();
            console.log ("height", height, "width", width);
		    var smallestDimension = Math.min (width, height) || 350;
            var diameter = smallestDimension,
                radius = diameter / 2,
                innerRadius = radius - 120;        
            var svg = mainDivSel.append("svg")
                .attr("width", diameter)
                .attr("height", diameter)
                .append("g")
                .attr("transform", "translate(" + radius + "," + radius + ")")
            ;
            
            var interactors = this.model.get("clmsModel").get("interactors");
            var crossLinks = this.model.get("clmsModel").get("crossLinks");
            console.log ("interactors", interactors, "clmsModel", crossLinks);
            var layout = this.calcLayout (interactors, crossLinks, [0,360]);
            console.log ("layout", layout);

 
            var color = d3.scale.ordinal()
                .domain([0,2])
                .range(["#f7f7f7", "#67a9cf" , "#ef8a62"]);

            

            var line = d3.svg.line.radial()
                .interpolate("bundle")
                .tension(.45)
                .radius(function(d) { return d.rad; })
                .angle(function(d) { return (d.ang) * (Math.PI/180); })
            ;

            var arc = d3.svg.arc()
                .innerRadius(radius-10)
                .outerRadius(radius)
                .startAngle(function(d) { return d.start * (Math.PI/180); }) //converting from degs to radians
                .endAngle(function(d) { return d.end * (Math.PI/180); }) //just radians
            ;

            var nodes = layout.nodes;
            var links = layout.links;
            var newLinks = this.convertLinks (links, radius - 10);
            console.log ("newLinks", newLinks);
            
            svg.selectAll(".link")
                .data(newLinks)
              .enter().append("path")
                .attr("class", "link")
                .attr("d", line)
                .attr("fill", "none")
                .attr("stroke-width", "1px")
                .attr("stroke", "#666");

            svg.selectAll(".link").append("title")
                .text(function(d) { return d.id; });
                

            svg.selectAll('n')
              .data(nodes)
              .enter()
              .append('path')
              .attr("class", "n")
               .attr("d", arc)
               .style("fill", function(d,i) { return color(i); })
              //.attr("transform", function(d) { return "rotate(" + (d.x) + ")translate(" + d.y + ")"; })
            ;



                
            this.listenTo (this.model, "filteringDone", this.render);    // listen to custom filteringDone event from model
            //this.listenTo (this.model.get("filterModel"), "change", this.render);    // any property changing in the filter model means rerendering this view
            this.listenTo (this.model.get("rangeModel"), "change:scale", this.relayout); 
            
            return this;
        },

        calcLayout: function (interactors, crossLinks, range) {

            var totalLength = 0;
            interactors.forEach (function (value, key) {
                if (!value.isDecoy()) {
                    totalLength += value.size;
                }
            });
            var scale = d3.scale.linear().domain([0,totalLength]).range(range);
            
            var nodeMap = d3.map();
            var total = 0;
            interactors.forEach (function (value, key) {
                if (!value.isDecoy()) {
                    nodeMap.set (key, {id: key, rawStart: total, start: scale(total), end: scale(total + value.size)} );
                    total += value.size;
                }
            });
            
            var linkMap = d3.map ();
            crossLinks.forEach (function (value, key) {
                var fromRes = value.fromResidue;
                var toRes = value.toResidue;
                var fromProt = value.proteinLink.fromProtein;
                var toProt = value.proteinLink.toProtein;
                //console.log ("f", fromProt, toProt, nodeMap);
                if (!fromProt.isDecoy() && !toProt.isDecoy()) {
                    linkMap.set (key, {
                        id: key, 
                        start: scale (fromRes + nodeMap.get(fromProt.id).rawStart), 
                        end: scale (toRes + nodeMap.get(toProt.id).rawStart),
                    });
                }
            });
            
            
            return { nodes: nodeMap.values(), links: linkMap.values() };
        },
        
        convertLinks: function (links, rad) {
            var newLinks = links.map (function (link) {
                return [{ang: link.start, rad: rad},{ang: (link.start + link.end) /2, rad: 0}, {ang: link.end, rad: rad}];
            });
            return newLinks;
        },
	
	
        // Lazily construct the package hierarchy from class names.
        root: function(classes) {
            var map = {};

            function find(name, data) {
              var node = map[name], i;
              if (!node) {
                node = map[name] = data || {name: name, children: []};
                if (name.length) {
                  node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
                  node.parent.children.push(node);
                  node.key = name.substring(i + 1);
                }
              }
              return node;
            }

            classes.forEach(function(d) {
              find(d.name, d);
            });

            return map[""];
        },

        // Return a list of imports for the given array of nodes.
        imports: function(nodes) {
            var map = {},
                imports = [];

            // Compute a map from name to node.
            nodes.forEach(function(d) {
              map[d.name] = d;
            });

            // For each import, construct a link from the source to target node.
            nodes.forEach(function(d) {
              if (d.imports) d.imports.forEach(function(i) {
                imports.push({source: map[d.name], target: map[i]});
              });
            });

            return imports;
        },


        render: function () {
            
            if (global.CLMSUI.utils.isZeptoDOMElemVisible (this.$el)) {

                console.log ("re rendering circular view");

            }

            return this;
        },


        // removes view
        // not really needed unless we want to do something extra on top of the prototype remove function (like destroy c3 view just to be sure)
        remove: function () {
            global.CLMSUI.CircularViewBB.__super__.remove.apply (this, arguments);    
        
            // this line destroys the c3 chart and it's events and points the this.chart reference to a dead end
            //this.chart = this.chart.destroy();
        }

    });
    
} (this));
