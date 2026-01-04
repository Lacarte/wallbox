/**
 * TrapezoidBox Class
 * Handles the creation and management of the 3D box geometry
 */

class TrapezoidBox {
    constructor(scene) {
        this.scene = scene;

        // Default Dimensions
        this.tw = 30; // Top Width
        this.bw = 20; // Bottom Width
        this.h = 25;  // Height
        this.d = 15;  // Depth
        this.fw = 2;  // Flap Width

        // Material Colors
        this.colors = {
            back: 0xA0826D,
            bottom: 0x8B7355,
            left: 0xC19A6B,
            right: 0xD2B48C,
            lid: 0xCD853F,
            front: 0xDEB887,
            flap: 0xF5DEB3,
            edges: 0x654321
        };

        // Group to hold all box parts
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Panels dictionary for easy access
        this.panels = {};

        // Initial creation
        this.createGeometry();
    }

    // Update dimensions from UI
    updateDimensions(params) {
        this.tw = params.topWidth || this.tw;
        this.bw = params.bottomWidth || this.bw;
        this.h = params.height || this.h;
        this.d = params.depth || this.d;
        this.fw = params.flapWidth || this.fw;

        this.rebuild();
    }

    rebuild() {
        // Remove existing parts
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.panels = {};

        // Create new geometry
        this.createGeometry();
    }

    createGeometry() {
        // Material factory helper
        const createMat = (color) => new THREE.MeshLambertMaterial({
            color: color,
            side: THREE.DoubleSide
        });


        // 1. Back Panel (Trapezoid) -- Centered at local 0
        const backShape = new THREE.Shape();
        const halfTw = this.tw / 2;
        const halfBw = this.bw / 2;
        const halfH = this.h / 2;

        // Drawing Counter Clockwise
        backShape.moveTo(-halfBw, -halfH);
        backShape.lineTo(halfBw, -halfH);
        backShape.lineTo(halfTw, halfH);
        backShape.lineTo(-halfTw, halfH);
        backShape.closePath();

        const backGeom = new THREE.ShapeGeometry(backShape);
        this.panels.back = new THREE.Mesh(backGeom, createMat(this.colors.back));
        this.panels.back.position.z = -this.d / 2;
        this.group.add(this.panels.back);

        // 2. Bottom Panel (Rectangle bw x d)
        // Connects to Back Bottom Edge (-halfBw to halfBw at y=-halfH)
        const bottomGeom = new THREE.PlaneGeometry(this.bw, this.d);
        this.panels.bottom = new THREE.Mesh(bottomGeom, createMat(this.colors.bottom));
        this.panels.bottom.rotation.x = Math.PI / 2;
        // Position: X=0, Y=-halfH, Z=0 (Center of bottom panel creates offset)
        // Bottom Panel center is at Z=0. Back connect is at Z=-d/2.
        this.panels.bottom.position.set(0, -halfH, 0);
        this.group.add(this.panels.bottom);

        // 3. Lid Panel (Rectangle tw x d)
        // Connects to Back Top Edge (-halfTw to halfTw at y=halfH)
        const lidGeom = new THREE.PlaneGeometry(this.tw, this.d);
        this.panels.lid = new THREE.Mesh(lidGeom, createMat(this.colors.lid));
        this.panels.lid.rotation.x = Math.PI / 2; // Initial flat? No, closed.
        // Closed lid covers the top.
        this.panels.lid.position.set(0, halfH, 0);
        this.group.add(this.panels.lid);

        // 4. Side Panels
        // Connect Back Side Edge to Front.
        // Side Edge vector: (-halfTw, halfH) to (-halfBw, -halfH).
        // Length of this edge (Slant Height):
        const dx = (this.tw - this.bw) / 2;
        const dy = this.h;
        const slantHeight = Math.sqrt(dx * dx + dy * dy);
        const slantAngle = Math.atan2(dx, dy); // Angle from vertical

        // Left Side
        const sideGeom = new THREE.PlaneGeometry(this.d, slantHeight);
        this.panels.left = new THREE.Mesh(sideGeom, createMat(this.colors.left));

        // Orientation
        this.panels.left.rotation.order = 'YXZ';
        this.panels.left.rotation.y = Math.PI / 2;
        this.panels.left.rotation.x = -slantAngle;

        // Position Correction:
        // We want the Bottom-Back corner of the Side Panel to match the Bottom-Back corner of the Box Hinge.
        // Hinge Corner: (-bw/2, -h/2, -d/2)
        const hingeCorner = new THREE.Vector3(-this.bw / 2, -this.h / 2, -this.d / 2);

        // Find the Local Vector of that corner on the Mesh
        // PlaneGeometry(d, slantH) centered at 0,0.
        // Width(d) is along X (mapped to World Z after Y-rot). 
        // Height(slantH) is along Y.
        // Back Edge is at local x = -d/2.
        // Bottom Edge is at local y = -slantHeight/2.
        const localCorner = new THREE.Vector3(-this.d / 2, -slantHeight / 2, 0);

        // Apply Mesh Rotation to this vector
        localCorner.applyEuler(this.panels.left.rotation);

        // Mesh Position = Target World Corner - Rotated Local Corner
        this.panels.left.position.copy(hingeCorner).sub(localCorner);

        this.group.add(this.panels.left);

        // Right Side
        this.panels.right = new THREE.Mesh(sideGeom, createMat(this.colors.right));
        this.panels.right.rotation.order = 'YXZ';
        this.panels.right.rotation.y = Math.PI / 2;
        this.panels.right.rotation.x = slantAngle;

        const rightHingeCorner = new THREE.Vector3(this.bw / 2, -this.h / 2, -this.d / 2);
        // Local corner is same (symmetry handles by rotation? No, checked below)
        // Right Side: Rotated Y=90. Rotated X=+slant.
        // Width(d) along X. Back Edge is x = -d/2.
        // Bottom Edge is y = -slantH/2.
        const rightLocalCorner = new THREE.Vector3(-this.d / 2, -slantHeight / 2, 0);
        rightLocalCorner.applyEuler(this.panels.right.rotation);

        this.panels.right.position.copy(rightHingeCorner).sub(rightLocalCorner);

        this.group.add(this.panels.right);

        // --- Flaps (Parented to Panels) ---
        // Geometry translated so origin (0,0,0) is at the hinge edge.
        // Flaps extend in POSITIVE Y direction in parent's local space.
        // This means they extend toward the FRONT edge of each panel.

        // 5. Lid Flap (attached to Lid)
        // Lid's local Y+ points toward front edge (Z+ in world when closed)
        const lidFlapGeom = new THREE.PlaneGeometry(this.tw, this.fw);
        lidFlapGeom.translate(0, this.fw / 2, 0); // Origin at hinge edge, extends Y+

        this.panels.lidFlap = new THREE.Mesh(lidFlapGeom, createMat(this.colors.flap));
        this.panels.lidFlap.name = "LidFlap";
        this.panels.lid.add(this.panels.lidFlap);

        // Position at Lid Front Edge (local Y = d/2)
        this.panels.lidFlap.position.set(0, this.d / 2, 0);
        // Rotation handled by animation controller

        // 6. Side Flaps (attached to Sides)
        // Side panels have rotation.y = 90°, so their local X points toward world Z (front)
        // Flaps should extend from the front edge (local X = d/2) outward

        // Left Flap - attached to left side, extends toward front
        const leftFlapGeom = new THREE.PlaneGeometry(this.fw, slantHeight);
        leftFlapGeom.translate(this.fw / 2, 0, 0); // Origin at hinge, extends X+

        this.panels.leftFlap = new THREE.Mesh(leftFlapGeom, createMat(this.colors.flap));
        this.panels.left.add(this.panels.leftFlap);
        this.panels.leftFlap.position.set(this.d / 2, 0, 0); // Front edge of left panel
        // Rotation handled by animation controller

        // Right Flap - attached to right side, extends toward front
        const rightFlapGeom = new THREE.PlaneGeometry(this.fw, slantHeight);
        rightFlapGeom.translate(this.fw / 2, 0, 0); // Origin at hinge, extends X+

        this.panels.rightFlap = new THREE.Mesh(rightFlapGeom, createMat(this.colors.flap));
        this.panels.right.add(this.panels.rightFlap);
        this.panels.rightFlap.position.set(this.d / 2, 0, 0); // Front edge of right panel
        // Rotation handled by animation controller

        // FRONT Panel - Same shape as BACK (trapezoid), attached to bottom panel
        const frontShape = new THREE.Shape();
        frontShape.moveTo(-halfBw, -halfH);
        frontShape.lineTo(halfBw, -halfH);
        frontShape.lineTo(halfTw, halfH);
        frontShape.lineTo(-halfTw, halfH);
        frontShape.closePath();

        const frontGeom = new THREE.ShapeGeometry(frontShape);
        // Translate geometry so bottom edge is at origin (attaches to bottom)
        frontGeom.translate(0, halfH, 0); // Move so bottom edge is at y=0

        this.panels.front = new THREE.Mesh(frontGeom, createMat(this.colors.front));
        this.panels.bottom.add(this.panels.front);
        // Position at front edge of bottom panel
        this.panels.front.position.set(0, this.d / 2, 0);

        // Add Edges
        this.addEdges();
    }

    addEdges() {
        const edgeMat = new THREE.LineBasicMaterial({ color: this.colors.edges, linewidth: 2 });

        for (let key in this.panels) {
            const mesh = this.panels[key];

            // Create edges geometry
            // For ShapeGeometry (Back), EdgesGeometry works well.
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const line = new THREE.LineSegments(edges, edgeMat);
            mesh.add(line);
            // Child of mesh -> moves with mesh.
        }

        // Add labels to all panels
        this.addLabels();
    }

    createTextSprite(text, fontSize = 48) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 128;

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw text
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = '#333333';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(8, 4, 1);

        return sprite;
    }

    addLabels() {
        // Label definitions: panel name -> display text
        const labels = {
            back: 'BACK',
            lid: 'LID',
            bottom: 'BOTTOM',
            left: 'LEFT',
            right: 'RIGHT',
            front: 'FRONT',
            lidFlap: 'Lid Flap',
            leftFlap: 'Left Flap',
            rightFlap: 'Right Flap'
        };

        for (let key in labels) {
            if (this.panels[key]) {
                const sprite = this.createTextSprite(labels[key], key.includes('Flap') ? 32 : 48);

                // Position the sprite slightly above the panel surface
                sprite.position.set(0, 0, 0.5);

                this.panels[key].add(sprite);
            }
        }
    }
}
