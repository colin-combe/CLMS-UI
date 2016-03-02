

    var CLMSUI = CLMSUI || {};
    CLMSUI.BackboneModelTypes = CLMSUI.BackboneModelTypes || {};
    
    CLMSUI.BackboneModelTypes.CompositeModelType = Backbone.Model.extend ({
        applyFilter: function () {
            var filterModel = this.get("filterModel");
            var crossLinks = this.get("clmsModel").get("crossLinks").values();
            for (var crossLink of crossLinks) {
                crossLink.filteredMatches = [];
                var unfilteredMatchCount = crossLink.matches.length;
                for (var i = 0; i < unfilteredMatchCount; i++){
                    var match = crossLink.matches[i];
                    var result = filterModel.filter(match[0]); // terrible hack here, that match shouldn't be an array
                    //console.log("result:"+result);
                    if (result === true){
                        crossLink.filteredMatches.push(match);
                    }
                }
            }
        },

        getFilteredCrossLinks: function (crossLinks) {
            //console.log ("crosslinks", crossLinks);
            var result = new Map;

            crossLinks.forEach (function (value, key) {
                if (!value.filteredMatches || value.filteredMatches.length > 0) { result.set (key, value); }
            }, this);

            return result;

            //return crossLinks.filter (function(cLink) {
            //    return cLink.filteredMatches.length > 0;
            //}); 
        },
    
    });
