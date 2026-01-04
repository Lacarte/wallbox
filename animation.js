/**
 * UnfoldController Class
 * Manages the progressive unfolding animation of the box sections.
 */
class UnfoldController {
    constructor(box, camera) {
        this.box = box;
        this.camera = camera;
        this.progress = 0;

        // Save initial camera state for reset
        this.initialCameraPos = camera.position.clone();
        this.initialCameraQuat = camera.quaternion.clone();

        this.saveRestPose();
    }

    saveRestPose() {
        this.restPose = {};
        for (let key in this.box.panels) {
            const p = this.box.panels[key];
            this.restPose[key] = {
                pos: p.position.clone(),
                rot: p.rotation.clone(),
                scale: p.scale.clone()
            };
        }
    }

    update(progress) {
        this.progress = progress;

        // Reset all panels to rest pose first (This resets children too!)
        for (let key in this.box.panels) {
            const p = this.box.panels[key];
            const rest = this.restPose[key];
            if (!rest) continue;

            p.position.copy(rest.pos);
            p.rotation.copy(rest.rot);
            p.scale.copy(rest.scale);
        }

        const h = this.box.h;
        const d = this.box.d;
        const hh = h / 2;

        // All panels close simultaneously to form the box
        // Progress 0 = open (flat 2D pattern), Progress 1 = fully closed (assembled box)
        const closeProgress = Easing.easeInOutCubic(progress); // 0 = open, 1 = closed
        const openAmount = 1 - closeProgress; // Reverse: 0 = closed, 1 = open

        // When fully open: all panels lay flat in the XY plane (Z = -d/2), same as back panel
        // Lid and Bottom need to rotate 90° from horizontal to vertical (in XY plane)
        // Left and Right need to rotate 90° from their closed position to lay flat

        // 1. LID - Rotates around back top edge
        // Closed: horizontal (rotation.x = 90°), facing forward
        // Open: vertical in XY plane, above back panel
        // Need to rotate -90° around X axis at the back edge
        const lidPivot = new THREE.Vector3(0, hh, -d / 2);
        const lidAngle = openAmount * (Math.PI / 2); // 90 degrees
        this.rotateAroundPivot(this.box.panels.lid, lidPivot, new THREE.Vector3(1, 0, 0), -lidAngle);

        // 2. BOTTOM - Rotates around back bottom edge
        // Closed: horizontal (rotation.x = 90°), facing forward
        // Open: vertical in XY plane, below back panel
        // Need to rotate +90° around X axis at the back edge
        const bottomPivot = new THREE.Vector3(0, -hh, -d / 2);
        const bottomAngle = openAmount * (Math.PI / 2); // 90 degrees
        this.rotateAroundPivot(this.box.panels.bottom, bottomPivot, new THREE.Vector3(1, 0, 0), bottomAngle);

        // 3. LEFT SIDE - Rotates around back left edge toward front panel
        // At progress=0 (Fully Open): left side at 45° (halfway between flat and perpendicular)
        // At progress=1 (Box Assembled): left side fully flat against front panel
        // Offset: starts at 90° and goes to 180° as box closes
        const leftP1 = new THREE.Vector3(-this.box.bw / 2, -hh, -d / 2);
        const leftP2 = new THREE.Vector3(-this.box.tw / 2, hh, -d / 2);
        const leftAxis = new THREE.Vector3().subVectors(leftP2, leftP1).normalize();
        // Base 90° + additional 90° as closeProgress goes 0->1
        const leftAngle = (Math.PI / 2) + (closeProgress * (Math.PI / 2)); // 90° to 180°
        this.rotateAroundPivot(this.box.panels.left, leftP1, leftAxis, leftAngle);

        // 4. RIGHT SIDE - Rotates around back right edge toward front panel
        // At progress=0 (Fully Open): right side at 45° (halfway between flat and perpendicular)
        // At progress=1 (Box Assembled): right side fully flat against front panel
        // Offset: starts at 90° and goes to 180° as box closes
        const rightP1 = new THREE.Vector3(this.box.bw / 2, -hh, -d / 2);
        const rightP2 = new THREE.Vector3(this.box.tw / 2, hh, -d / 2);
        const rightAxis = new THREE.Vector3().subVectors(rightP2, rightP1).normalize();
        // Base 90° + additional 90° as closeProgress goes 0->1
        const rightAngle = (Math.PI / 2) + (closeProgress * (Math.PI / 2)); // 90° to 180°
        this.rotateAroundPivot(this.box.panels.right, rightP1, rightAxis, -rightAngle);

        // 5. FLAPS - When closed: fold INTO the box. When open: lay flat with parent.
        // All flaps extend in positive direction of parent's local space.
        // When closed (progress=1): flaps perpendicular to parent (folded into box)
        // When open (progress=0): flaps coplanar with parent (flat 2D pattern)

        // Lid Flap: When open, needs to lay flat extending above the lid
        // At progress=0: 0° (Flat, coplanar with lid in 2D pattern)
        // At progress=1: +90° (Folded down into box)
        this.box.panels.lidFlap.rotation.x = (Math.PI / 2) * closeProgress;

        // Lid Left Flap: Folds down on the left side of the lid
        // At progress=0: 0° (Flat, coplanar with lid)
        // At progress=1: +90° (Folded down into box)
        this.box.panels.lidLeftFlap.rotation.y = (Math.PI / 2) * closeProgress;

        // Lid Right Flap: Folds down on the right side of the lid
        // At progress=0: 0° (Flat, coplanar with lid)
        // At progress=1: -90° (Folded down into box)
        this.box.panels.lidRightFlap.rotation.y = (-Math.PI / 2) * closeProgress;

        // Front Panel: Rotates up from bottom to meet lid flap
        // At progress=0: 0° (Flat, coplanar with bottom in 2D pattern)
        // At progress=1: -90° (Folded up to close the front of the box)
        this.box.panels.front.rotation.x = (-Math.PI / 2) * closeProgress;

        // Left Flap: Rotates 90° inward
        // At progress=0: +45° (halfway)
        // At progress=1: +90° (Fully folded inward)
        this.box.panels.leftFlap.rotation.y = (Math.PI / 4) + (closeProgress * (Math.PI / 4)); // +45° to +90°

        // Right Flap: Rotates 90° inward
        // At progress=0: -45° (halfway)
        // At progress=1: -90° (Fully folded inward)
        this.box.panels.rightFlap.rotation.y = (-Math.PI / 4) - (closeProgress * (Math.PI / 4)); // -45° to -90°

        // Left Bottom Flap: Rotates inward under the bottom panel
        // At progress=0: 0° (Flat, coplanar with left side)
        // At progress=1: +90° (Folded inward under bottom)
        this.box.panels.leftBottomFlap.rotation.x = (Math.PI / 2) * closeProgress;

        // Right Bottom Flap: Rotates inward under the bottom panel
        // At progress=0: 0° (Flat, coplanar with right side)
        // At progress=1: +90° (Folded inward under bottom)
        this.box.panels.rightBottomFlap.rotation.x = (Math.PI / 2) * closeProgress;
    }

    rotateAroundPivot(mesh, pivot, axis, angle) {
        mesh.position.sub(pivot);
        mesh.position.applyAxisAngle(axis, angle);
        mesh.rotateOnWorldAxis(axis, angle);
        mesh.position.add(pivot);
    }
}
