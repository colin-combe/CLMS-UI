CLMSUI = CLMSUI || {};

CLMSUI.GoTerm = function() {
    this.is_a = new Set();
    this.intersection_of = new Set();
    this.relationship = new Set();
    this.interactors = new Set();

    this.children = [];
    this.parents = [];
    this.height = 30;
    this.width = 150;
    this.expanded = false;
    this.depth = 0;

    // //TODO - this wastes a bit memory coz the property is not on the prototype, fix
    // Object.defineProperty(this, "width", {
    //     get: function width() {
    //         return this.upperGroup.getBBox().width;
    //     }
    // });
    // Object.defineProperty(this, "height", {
    //     get: function height() {
    //         return this.upperGroup.getBBox().height;
    //     }
    // });
}

CLMSUI.GoTerm.prototype.getInteractors = function(interactorSet) {
    if (!interactorSet) {
        interactorSet = new Set();
    }
    for (var c of this.children) {
        c.getInteractors(interactorSet)
    }
    for (var i of this.interactors) {
        interactorSet.add(i);
    }
    return interactorSet;
}

CLMSUI.GoTerm.prototype.getBlobRadius = function() {
    var br = Math.sqrt(this.getInteractors().size / Math.PI) * 10;// * 0.7;
    return br;
};
