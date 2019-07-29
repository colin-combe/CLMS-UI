CLMSUI = CLMSUI || {};

CLMSUI.GoTerm = function() {
    this.is_a = new Set(); // i.e. superclasses
    this.subclasses = new Set();
    this.part_of = new Set();
    this.parts = new Set();
    this.interactors = new Set();
}

CLMSUI.GoTerm.prototype.getInteractors = function(interactorSet) {
    var go = CLMSUI.compositeModelInst.get("go");
    if (!interactorSet) {
        interactorSet = new Set();
    }
    for (let partId of this.parts) {
        go.get(partId).getInteractors(interactorSet);
    }
    for (let subclassId of this.subclasses) {
        go.get(subclassId).getInteractors(interactorSet);
    }
    for (let i of this.interactors) {
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
