pc.extend(pc.scene, function () {

    var identity = pc.math.mat4.create();
    var tempVec = pc.math.vec3.create();
    var tempQuat = pc.math.quat.create();

    /**
     * @name pc.scene.GraphNode
     * @class A node.
     * @param {String} name Non-unique, human readable name.
     */
    var GraphNode = function GraphNode(name) {
        this._name = name || ""; // Non-unique human readable name

        this.translation = pc.math.vec3.create(0, 0, 0);
        this.rotation = pc.math.quat.create(0, 0, 0, 1);
        this.scale = pc.math.vec3.create(1, 1, 1);
        this.dirtyLocal = false;
        this.dirtyWorld = false;

        this._ltm = pc.math.mat4.create();
        this._wtm = pc.math.mat4.create();

        this._parent = null;
        this._children = [];

        this._labels = {};
        this._graphId = -1;
    };

    GraphNode.prototype = {

        _cloneInternal: function (clone) {
            clone._name = this._name;
            pc.math.mat4.copy(this._ltm, clone._ltm);
            pc.math.mat4.copy(this._wtm, clone._wtm);
            clone._labels = pc.extend(this._lables, {});
            clone._graphId = this._graphId;
        },

        clone: function () {
            var clone = new pc.scene.GraphNode();
            this._cloneInternal(clone);
            return clone;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#addGraphId
         * @description The Graph ID is used to patch up nodes while loading graph data from files. A Graph ID is added during the loading process and should 
         * be removed again by called removeGraphId() once the loading is complete.
         * @param {String} id The ID from the data file which is added to the node temporarily
         */
        addGraphId: function (id) {
            this._graphId = id;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#removeGraphId
         * @description The Graph ID is used to patch up nodes while loading graph data from files. A Graph ID is added during the loading process by calling addGraphId() and should 
         * be removed again by called removeGraphId() once the loading is complete.
         */
        removeGraphId: function () {
            delete this._graphId;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#find
         * @description Search the graph for nodes using a supplied property or method name to get the value to search on.
         * @param {String} attr The attribute name on the node to search for, if this corresponds to a function name then the function return value is used in the comparison
         * @param {String} value The value of the attr to look for
         * @returns {Array} An array of GraphNodes
         * @example
         * var graph = ... // Get a pc.fw.Entity hierarchy from somewhere 
         * var results = graph.find("getGuid", "1234");
         */
        find: function (attr, value) {
            var i;
            var children = this.getChildren();
            var length = children.length;
            var results = [];
            var testValue;
            if(this[attr]) {
                if(this[attr] instanceof Function) {
                    testValue = this[attr]();    
                } else {
                    testValue = this[attr];
                }
                if(testValue === value) {
                    results.push(this);
                }            
            }
            
            for(i = 0; i < length; ++i) {
                results = results.concat(children[i].find(attr, value));
            }
            
            return results;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#findOne
         * @description @see pc.scene.GraphNode#find, but this will only return the first graph node
         * that it finds.
         * @param {String} attr The property or function name to search using.
         * @param {String} value The value to search for.
         * @returns {pc.scene.GraphNode} A single graph node.
         */
        findOne: function(attr, value) {
            var i;
            var children = this.getChildren();
            var length = children.length;
            var result = null;
            var testValue;
            if(this[attr]) {
                if(this[attr] instanceof Function) {
                    testValue = this[attr]();    
                } else {
                    testValue = this[attr];
                }
                if(testValue === value) {
                    return this;
                }
            }
            
            for(i = 0; i < length; ++i) {
                 result = children[i].findOne(attr, value);
                 if(result !== null) {
                     return result;
                 }
            }
            
            return null;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#findByName
         * @description Get the first node found in the graph with the name. The search
         * is depth first.
         * @returns {pc.scene.GraphNode} The first node to be found matching the supplied name.
         * @author Will Eastcott
         */
        findByName: function (name) {
            if (this._name === name) return this;

            for (var i = 0; i < this._children.length; i++) {
                var found = this._children[i].findByName(name);
                if (found !== null) return found;
            }
            return null;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#findByGraphId
         * @description
         * @returns {pc.scene.GraphNode}
         */
        findByGraphId: function (id) {
            if (this._graphId === id) return this;

            for (var i = 0; i < this._children.length; i++) {
                var found = this._children[i].findByGraphId(id);
                if (found !== null) return found;
            }
            return null;

        },

        /**
         * @function
         * @name pc.scene.GraphNode#getRoot
         * @description Get the highest ancestor node from this graph node.
         * @return {pc.scene.GraphNode} The root node of the hierarchy to which this node belongs.
         */
        getRoot: function () {
            var parent = this.getParent()
            if(!parent) {
                return this;
            }
            
            while(parent.getParent()) {
                parent = parent.getParent();
            }
            return parent;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getParent
         * @description Get the parent GraphNode
         * @returns {pc.scene.GraphNode} The parent node
         */
        getParent: function () {
            return this._parent;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getChildren
         * @description Get the children of this graph node.
         * @returns {Array} The child array of this node.
         * @author Will Eastcott
         */
        getChildren: function () {
            return this._children;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getLocalTranslation
         * @description Get the translation in local space for the specified GraphNode. This
         * function internally allocates a 3-dimensional vector and copies the translational
         * components of the graph node's local transformation matrix into it. This vector
         * is returned by the function.
         * @returns {pc.math.vec3} The local space translation of the graph node.
         * @author Will Eastcott
         */
        /**
         * @function
         * @name pc.scene.GraphNode#getLocalTranslation^2
         * @description Get the translation in local space for the specified GraphNode. By
         * supplying a 3-dimensional vector as a parameter, this function will not 
         * allocate internally and is therefore more optimal than the other 
         * pc.scene.GraphNode#getLocalTranslation prototype.
         * @param {pc.math.vec3} pos A pre-alloacted 3-dimensional vector to receive the
         * local space translation of the graph node.
         * @returns {pc.math.vec3} The local space translation of the graph node (simply a 
         * reference to the parameter passed to the function).
         * @author Will Eastcott
         */
        getLocalTranslation: function () {
            return this.translation;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getLocalTransform
         * @description Get the local transform matrix for this graph node. This matrix
         * is the transform relative to the node's parent's world transformation matrix.
         * @returns {pc.math.mat4} The node's local transformation matrix.
         * @author Will Eastcott
         */
        getLocalTransform: function () {
            return this._ltm;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getName
         * @description Get the human-readable name for this graph node. Note the name
         * is not guaranteed to be unique.
         * @returns {String} The name of the node.
         * @author Will Eastcott
         */
        getName: function () {
            return this._name;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getWorldTranslation
         * @description Get the translation in world space for the specified GraphNode. This
         * function internally allocates a 3-dimensional vector and copies the translational
         * components of the graph node's world transformation matrix into it. This vector
         * is returned by the function.
         * @returns {pc.math.vec3} The world space translation of the graph node.
         * @author Will Eastcott
         */
        /**
         * @function
         * @name pc.scene.GraphNode#getWorldTranslation^2
         * @description Get the translation in world space for the specified GraphNode. By
         * supplying a 3-dimensional vector as a parameter, this function will not 
         * allocate internally and is therefore more optimal than the other 
         * pc.scene.GraphNode#getWorldTranslation prototype.
         * @param {pc.math.vec3} pos A pre-alloacted 3-dimensional vector to receive the
         * world space translation of the graph node.
         * @returns {pc.math.vec3} The world space translation of the graph node (simply a 
         * reference to the parameter passed to the function).
         * @author Will Eastcott
         */
        getWorldTranslation: function () {
            if (arguments.length === 1) {
                var pos = arguments[0];
                pos[0] = this._wtm[12];
                pos[1] = this._wtm[13];
                pos[2] = this._wtm[14];
                return pos;
            } else {
                return pc.math.vec3.create(this._wtm[12], this._wtm[13], this._wtm[14]);
            }
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getWorldTransform
         * @description Get the world transformation matrix for this graph node.
         * @returns {pc.math.mat4} The node's world transformation matrix.
         * @author Will Eastcott
         */
        getWorldTransform: function () {
            return this._wtm;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#setParent
         * @description Set the parent node of this node. Note, this does not update the children of the parent
         * @param {pc.scene.GraphNode} node The node to use as the parent
         */
        setParent: function (node) {
            this._parent = node;
        },
    
        /**
         * @function
         * @name pc.scene.GraphNode#setChildren
         * @description Set the child array of this node. Note, this does not update the parent value of the children.
         * @param {Array} children 
         * @author Will Eastcott
         */
        setChildren: function (children) {
            this._children = children;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#setLocalTranslation
         * @description Sets the local space translation of the specified graph node.
         * @param {pc.math.vec3} pos Translation vector of graph node in local-space.
         * @author Will Eastcott
         */
        /**
         * @function
         * @name pc.scene.GraphNode#setLocalTranslation^2
         * @description Sets the local space translation of the specified graph node.
         * @param {Number} x x-coordinate of local-space translation.
         * @param {Number} y y-coordinate of local-space translation.
         * @param {Number} z z-coordinate of local-space translation.
         * @author Will Eastcott
         */
        setLocalTranslation: function () {
            if (arguments.length === 1) {
                this.translation[0] = arguments[0][0];
                this.translation[1] = arguments[0][1];
                this.translation[2] = arguments[0][2];
            } else {
                this.translation[0] = arguments[0];
                this.translation[1] = arguments[1];
                this.translation[2] = arguments[2];
            }
            this.dirtyLocal = true;
        },

        setLocalRotation: function () {
            if (arguments.length === 1) {
                pc.math.quat.copy(arguments[0], this.rotation);
            } else {
                pc.math.quat.setFromEulers(this.rotation, arguments[0], arguments[1], arguments[2]);
            }
            this.dirtyLocal = true;
        },

        setLocalScale: function () {
            if (arguments.length === 1) {
                this.scale[0] = arguments[0][0];
                this.scale[1] = arguments[0][1];
                this.scale[2] = arguments[0][2];
            } else {
                this.scale[0] = arguments[0];
                this.scale[1] = arguments[1];
                this.scale[2] = arguments[2];
            }
            this.dirtyLocal = true;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#setLocalTransform
         * @description Sets the local space transform (relative to the parent graph node's
         * world transform) of the specified graph node.
         * @param {pc.math.mat4} ltm Local transformation matrix to apply.
         * @author Will Eastcott
         */
        setLocalTransform: function (ltm) {
            this._ltm = ltm;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#setName
         * @description Sets the non-unique name for this graph node.
         * @param {String} name The name for the node.
         * @author Will Eastcott
         */
        setName: function (name) {
            this._name = name;
        },

        /**
         * @function 
         * @name pc.scene.GraphNode#addChild
         * @description Add a new child to the child list and update the parent value of the child node
         * @param {pc.scene.GraphNode} node The new child to add
         */
        addChild: function (node) {
            if(node.getParent() != null) {
                throw new Error("GraphNode is already parented")
            }

            this._children.push(node);
            node.setParent(this);
        },

        /**
         * @function
         * @name pc.scene.GraphNode#removeChild
         * @description Remove the node from the child list and update the parent value of the child.
         * @param {pc.scene.GraphNode} node The node to remove
         */
        removeChild: function (child) {
            var i;
            var length = this._children.length;
            
            // Clear parent
            child.setParent(null);
            
            // Remove from child list
            for(i = 0; i < length; ++i) {
                if(this._children[i] === child) {
                    this._children.splice(i, 1);
                    return;
                }
            }
        },

        /**
         * @function 
         * @name pc.scene.GraphNode#addLabel
         * @description Add a string label to this graph node, labels can be used to group
         * and filter nodes. For example, the 'enemies' label could be applied to a group of NPCs
         * who are enemies.
         * @param {String} label The label to apply to this graph node.
         */
        addLabel: function (label) {
            this._labels[label] = true;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#getLabels
         * @description Get an array of all labels applied to this graph node.
         * @returns {Array} An array of all labels.
         */
        getLabels: function () {
            return Object.keys(this._labels);
        },

        /**
         * @function
         * @name pc.scene.GraphNode#hasLabel
         * @description Test if a label has been applied to this graph node.
         * @param {String} label The label to test for.
         * @returns {Boolean} True if the label has been added to this GraphNode.
         */
        hasLabel: function (label) {
            return !!this._labels[label];
        },

        /**
         * @function
         * @name pc.scene.GraphNode#removeLabel
         * @description Remove label from this graph node.
         * @param {String} label The label to remove from this node.
         */
        removeLabel: function (label) {
            delete this._labels[label];
        },

        /**
         * @function
         * @name pc.scene.GraphNode#findByLabel
         * @description Find all graph nodes from the root and all descendants with the label.
         * @param {String} label The label to search for.
         * @param {Array} results An array to store the results in.
         * @returns The array passed in or a new array of results.
         */
        findByLabel: function (label, results) {
            var i, length = this._children.length;
            results = results || [];
            
            if(this.hasLabel(label)) {
                results.push(this);
            }
            
            for(i = 0; i < length; ++i) {
                results = this._children[i].findByLabel(label, results);
            }
            
            return results;
        },

        /**
         * @function
         * @name pc.scene.GraphNode#syncHierarchy
         * @description Updates the world transformation matrices at this node and all of its descendants.
         * @author Will Eastcott
         */
        syncHierarchy: function () {
            this.sync();

            // Sync subhierarchy
            for (var i = 0, len = this._children.length; i < len; i++) {
                this._children[i].syncHierarchy();
            }
        },

        sync: function () {
            if (this.dirtyLocal) {
                var qx = this.rotation[0];
                var qy = this.rotation[1];
                var qz = this.rotation[2];
                var qw = this.rotation[3];

                var x2 = qx + qx;
                var y2 = qy + qy;
                var z2 = qz + qz;
                var xx = qx * x2;
                var xy = qx * y2;
                var xz = qx * z2;
                var yy = qy * y2;
                var yz = qy * z2;
                var zz = qz * z2;
                var wx = qw * x2;
                var wy = qw * y2;
                var wz = qw * z2;

                this._ltm[0] = (1.0 - (yy + zz)) * this.scale[0];
                this._ltm[1] = (xy - wz) * this.scale[0];
                this._ltm[2] = (xz + wy) * this.scale[0];
                this._ltm[3] = 0.0;

                this._ltm[4] = (xy + wz) * this.scale[1];
                this._ltm[5] = (1.0 - (xx + zz)) * this.scale[1];
                this._ltm[6] = (yz - wx) * this.scale[1];
                this._ltm[7] = 0.0;

                this._ltm[8] = (xz - wy) * this.scale[2];
                this._ltm[9] = (yz + wx) * this.scale[2];
                this._ltm[10] = (1.0 - (xx + yy)) * this.scale[2];
                this._ltm[11] = 0.0;

                this._ltm[12] = this.translation[0];
                this._ltm[13] = this.translation[1];
                this._ltm[14] = this.translation[2];
                this._ltm[15] = 1.0;

                this.dirtyLocal = false;
                this.dirtyWorld = true;
            }

            if (this.dirtyWorld) {
                if (this._parent === null) { 
                    pc.math.mat4.copy(this._ltm, this._wtm);
                } else {
                    pc.math.mat4.multiply(this._parent._wtm, this._ltm, this._wtm);
                }

                for (var i = 0, len = this._children.length; i < len; i++) {
                    this._children[i].dirtyWorld = true;
                }

                this.dirtyWorld = false;
            }
        },

        /**
         * @function
         * @name pc.scene.GraphNode#lookAt
         * @description Reorients the graph node so that the z axis points towards the target.
         * @param {pc.math.vec3} target The world space coordinate to 'look at'.
         * @param {pc.math.vec3} up The up vector for the look at transform. If left unspecified,
         * this is set to the world space y axis.
         * @author Will Eastcott
         */
        lookAt: function () {
            var target, up;

            switch (arguments.length) {
                case 1:
                    target = arguments[0];
                    up = pc.math.vec3.yaxis;
                    break;
                case 2:
                    target = arguments[0];
                    up = arguments[1];
                    break;
                case 3:
                    target = tempVec;
                    target[0] = arguments[0];
                    target[1] = arguments[1];
                    target[2] = arguments[2];
                    up = pc.math.vec3.yaxis;
                    break;
            }

            var m = pc.math.mat4.makeLookAt(this.translation, target, up);
            pc.math.mat4.toQuat(m, this.rotation);
        },

        /**
         * @function
         * @name pc.scene.GraphNode#translate
         * @description Translates the graph node by the given translation vector.
         * @param {pc.math.vec3} translation The translation vector to apply.
         * @param {pc.scene.Space} space The coordinate system that the translation is relative to.
         * In left unspecified, local space is assumed.
         * @author Will Eastcott
         */
        /**
         * @function
         * @name pc.scene.GraphNode#translate^2
         * @description Translates the graph node by the given translation vector.
         * @param {Number} x x-component of the translation vector.
         * @param {Number} y y-component of the translation vector.
         * @param {Number} z z-component of the translation vector.
         * @param {pc.scene.Space} space The coordinate system that the translation is relative to.
         * In left unspecified, local space is assumed.
         * @author Will Eastcott
         */
        translate: function () {
            var x = 0, y = 0, z = 0, local = true;

            switch (arguments.length) {
                case 1:
                    x = arguments[0][0];
                    y = arguments[0][1];
                    z = arguments[0][2];
                    break;
                case 3:
                    x = arguments[0];
                    y = arguments[1];
                    z = arguments[2];
                    break;
            }

            var relativeTo;
            if (arguments.length >= 3) {
                relativeTo = arguments[3];
                if ((relativeTo === undefined) || (relativeTo === pc.scene.Space.LOCAL)) {
                    this.translation[0] += arguments[0];
                    this.translation[1] += arguments[1];
                    this.translation[2] += arguments[2];
                    this.dirtyLocal = true;
                }
            } else {
                relativeTo = arguments[1];
                if ((relativeTo === undefined) || (relativeTo === pc.scene.Space.LOCAL)) {
                    this.translation[0] += arguments[0][0];
                    this.translation[1] += arguments[0][1];
                    this.translation[2] += arguments[0][2];
                    this.dirtyLocal = true;
                }
            }
        },

        rotate: function (x, y, z) {
            pc.math.quat.setFromEulers(tempQuat, x, y, z);
            pc.math.quat.multiply(this.rotation, tempQuat, this.rotation);
            this.dirtyLocal = true;
        }
    };

    return {
        GraphNode: GraphNode
    }; 
}());