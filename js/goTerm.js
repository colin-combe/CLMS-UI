CLMSUI = CLMSUI || {};

CLMSUI.GoTerm = function() {
  this.is_a = new Set();
  this.part_of = new Set();
  this.intersection_of = new Set();
    this.relationship = new Set();
    this.interactors = new Set();

    this.is_aChildren = [];
    this.is_aParents = [];
    this.part_ofChildren = [];
    this.height = 25;
    this.width = 50;
    this.expanded = false;
    this.depth = 0;

    //TODO - this wastes a bit memory coz the property is not on the prototype, fix
    // Object.defineProperty(this, "width", {
    //     get: function width() {
    //         return this.upperGroup.getBBox().width;
    //     }
    // });
    // var self = this;
    // Object.defineProperty(this, "height", {
    //     get: function height() {
    //         return Math.sqrt(self.getInteractors().size / Math.PI) * 10;;//this.upperGroup.getBBox().height;
    //     }
    // });
}

CLMSUI.GoTerm.prototype.getInteractors = function(interactorSet) {
    if (!interactorSet) {
        interactorSet = new Set();
    }
    for (var c of this.is_aChildren) {
        c.getInteractors(interactorSet);
    }
    for (var i of this.interactors.values()) {
        interactorSet.add(i);
    }
    return interactorSet;
}

/*
CLMSUI.GoTerm.prototype.getClosestVisibleParents = function(visibleParents) {
    if (!visibleParents) {
        visibleParents = new Set();
    }
    for (var parent of this.parents) {
        if (parent.isVisible()) {
            visibleParents.add(parent);
        } else {
            parent.getClosestVisibleParents(visibleParents);
        }
    }
    return visibleParents;
}

CLMSUI.GoTerm.prototype.isVisible = function() {
    if (this.parents.length == 0) {
        return true;
    } else {
        for (let p of this.parents) {
            if (p.expanded) {
                return true;
            }
        }
    }
    return false;
}
*/
