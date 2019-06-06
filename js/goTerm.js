CLMSUI = CLMSUI || {};

CLMSUI.GoTerm = function() {
    this.is_a = new Set();
    this.intersection_of = new Set();
    this.relationship = new Set();
    this.interactors = new Set();

    this.children = [];
    this.parents = [];
    this.height = 25;
    this.width = 50;
    this.expanded = false;
    this.depth = 0;
}

CLMSUI.GoTerm.prototype.getInteractors = function(interactorSet) {
    if (!interactorSet) {
        interactorSet = new Set();
    }
    for (var c of this.children) {
        c.getInteractors(interactorSet);
    }
    for (var i of this.interactors.values()) {
        interactorSet.add(i);
    }
    return interactorSet;
}

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
