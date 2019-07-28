CLMSUI = CLMSUI || {};

CLMSUI.GoTerm = function() {
    this.is_a = new Set();
    this.part_of = new Set();
    this.interactors = new Set();

    this.is_aChildren = [];
    this.is_aParents = [];
    this.part_ofChildren = [];
    this.part_ofParents = [];
}

CLMSUI.GoTerm.prototype.getInteractors = function(interactorSet) {
    if (!interactorSet) {
        interactorSet = new Set();
    }
    for (var c of this.part_ofChildren) {
        c.getInteractors(interactorSet);
    }
    for (var c of this.is_aChildren) {
        c.getInteractors(interactorSet);
    }
    for (var i of this.interactors.values()) {
        if (i.hidden == false) {
          interactorSet.add(i);
        }
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
