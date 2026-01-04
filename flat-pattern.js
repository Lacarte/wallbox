/**
 * FlatPatternRenderer Class
 * Renders the 2D technical drawing overlay on top of the 3D canvas
 */
class FlatPatternRenderer {
    constructor(box) {
        this.box = box;

        // Create 2D Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none'; // Click through to 3D
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        // Attach to container
        document.getElementById('canvas-container').appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Only draw if fully unfolded? OR always? 
        // Guide calls draw() loop.
        // We will verify "Unfold Progress" externally or just draw whenever called.
        // Assuming we only draw when "Flat".

        // Scale Setup
        // We want to fit the Flat Pattern in the view.
        // Dimensions:
        // Total Width = Lid(tw) + 2*SideFlaps? No.
        // Unfolded Layout:
        //       LidFlap
        //         |
        //        Lid
        //         |
        // Left - Back - Right
        //         |
        //       Bottom
        //         |
        //      BotFlap

        // Layout Sizes:
        // CENTER COLUMN: LidFlap(fw) + Lid(d) + Back(h) + Bottom(d) + BotFlap(fw).
        // WIDTH: Left(Slant) + Back(Top=tw/Bot=bw) + Right(Slant).
        // Wait, Left Side attaches to Back Side Edge.
        // Unfolded: Left Side sticks out to Left. Right Side to Right.
        // Left Flap attaches to Left Side.

        // Calculate Bounds
        const box = this.box;
        const centerH = box.fw + box.d + box.h + box.d + box.fw;

        // Width estimation:
        // Back width (max tw), plus Side Slant Height + Side Flap width.
        const dx = (box.tw - box.bw) / 2;
        const slantH = Math.sqrt(dx * dx + box.h * box.h);
        const totalW = box.tw + 2 * (slantH + box.fw);

        // Scale factor to fit canvas (with margin)
        const margin = 50;
        const scaleX = (w - margin * 2) / totalW;
        const scaleY = (h - margin * 2) / centerH;
        const scale = Math.min(scaleX, scaleY); // pixels per cm

        // Origin (Center of Back Panel)
        const cx = w / 2;
        // Calculate Y center relative to Back Panel center
        // Back panel center is roughly in middle of "h".
        // Top of back panel is at Y_back_top.
        // Let's center the whole bounding box.
        const cy = h / 2;

        ctx.save();
        ctx.translate(cx, cy);

        // Draw Helper
        const drawRect = (x, y, wid, hgt, label, color) => {
            // x,y are center relative? Or top-left?
            // Let's use Center coords.
            ctx.fillStyle = color;
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.rect(x - wid / 2, y - hgt / 2, wid, hgt);
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.fillStyle = '#000';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        };

        const drawPoly = (points, label, color) => {
            ctx.fillStyle = color;
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Label center?
            // Simple avg
            if (label) {
                let lx = 0, ly = 0;
                points.forEach(p => { lx += p.x; ly += p.y });
                ctx.fillStyle = '#000';
                ctx.fillText(label, lx / points.length, ly / points.length);
            }
        };

        const sc = (val) => val * scale;

        // Colors (match utils/box-geo)
        const C = {
            back: '#A0826D',
            lid: '#CD853F',
            liadFlap: '#F5DEB3',
            bottom: '#8B7355',
            botFlap: '#F5DEB3',
            side: '#C19A6B',
            sideFlap: '#F5DEB3'
        };

        // 1. BACK PANEL (Trapezoid)
        // Center at 0,0
        const halfTw = sc(box.tw / 2);
        const halfBw = sc(box.bw / 2);
        const halfH = sc(box.h / 2);

        // Points: TL, TR, BR, BL
        const backPts = [
            { x: -halfTw, y: -halfH }, // Note: Y goes down in Canvas usually.
            // Let's assume standard math coords (Y up) and flip at end? 
            // Or just work in Canvas Scale (Y down).
            // Let's use Y UP logic (negative Y is up) for visual matching.
            // Top Edge: y = -halfH. Bottom Edge: y = +halfH.
            { x: halfTw, y: -halfH },
            { x: halfBw, y: halfH },
            { x: -halfBw, y: halfH }
        ];
        drawPoly(backPts, "BACK", C.back);

        // 2. LID (Rect)
        // Attached to Top Edge (y = -halfH).
        // Height = box.d. Width = box.tw.
        // Center: x=0, y = -halfH - sc(box.d)/2.
        drawRect(0, -halfH - sc(box.d) / 2, sc(box.tw), sc(box.d), "LID", C.lid);

        // 3. LID FLAP
        // Attached to Top of Lid.
        drawRect(0, -halfH - sc(box.d) - sc(box.fw) / 2, sc(box.tw), sc(box.fw), "FLAP", C.liadFlap);

        // 4. BOTTOM
        // Attached to Bottom Edge (y = halfH).
        drawRect(0, halfH + sc(box.d) / 2, sc(box.bw), sc(box.d), "BOTTOM", C.bottom);

        // 5. BOTTOM FLAP
        drawRect(0, halfH + sc(box.d) + sc(box.fw) / 2, sc(box.bw), sc(box.fw), "FLAP", C.botFlap);

        // 6. SIDES
        // Left Side: Attached to Back Left Edge.
        // Edge: (-halfTw, -halfH) to (-halfBw, halfH).
        // We need to Rotate/Project the Side Panel out.
        // Angle of edge?
        // Length = sc(slantH). Width = sc(box.d).
        // It sticks out perpendicular to the edge normal?
        // Approximately: It extends to the Left.
        // Let's do a simple transform:
        // Position roughly to absolute left?
        // No, correct unfolding means maintaining the edge connection.

        // Let's compute the Angle of the Left Edge.
        const dy = halfH - (-halfH); // Total Height
        const dx_edge = -halfBw - (-halfTw); // Horizontal run (positive?)
        // (-halfBw) is closer to 0 than (-halfTw) usually (bw < tw).
        // So dx is positive.
        // Angle = atan2(dy, dx)?
        // We want the Normal Vector to this edge to Place the Side Panel.

        // Simplified: Just draw a Rectangle rotated?
        // Left Side Panel: Width=d, Height=slantH.
        // Center? 
        // Midpoint of Edge: x = (-halfTw - halfBw)/2, y = 0.
        // Rotate -Angle?

        // We will skip perfect trigonometry for this artifact iteration and approximate placement 
        // OR calculate correctly.
        // Angle of Left Edge:
        const edgeAngle = Math.atan2(dx, box.h); // radians from vertical
        // Rotation for Side Panel: -edgeAngle?

        ctx.save();
        // Translate to Midpoint of Left Edge
        ctx.translate(-(halfTw + halfBw) / 2, 0);
        // Rotate to match edge slope?
        // Actually, the side panel unfolds 90 degrees out from Z-axis to X-axis, 
        // but since the hinge is slanted, it lays flat perpendicular to the hinge!
        // Slope of hinge:
        const run = (box.bw - box.tw) / 2; // usually negative
        const rise = box.h;
        const ang = Math.atan(run / rise); // Angle from vertical

        ctx.rotate(-ang);
        // Draw Side Rectangle extending LEFT
        // Width = d. Height = slantH.
        // But slantH is the length of the hinge!
        // So Rectangle is (d x slantH).
        // Drawn to the Left (-x).
        // Center: x = -sc(box.d)/2, y = 0.
        drawRect(-sc(box.d) / 2, 0, sc(box.d), sc(slantH), "SIDE", C.side);

        // LEFT FLAP
        // Extends further Left.
        drawRect(-sc(box.d) - sc(box.fw) / 2, 0, sc(box.fw), sc(slantH), "FLAP", C.sideFlap);

        ctx.restore();

        // RIGHT SIDE (Similar)
        ctx.save();
        ctx.translate((halfTw + halfBw) / 2, 0);
        ctx.rotate(ang); // Symmetry
        // Draw Right
        drawRect(sc(box.d) / 2, 0, sc(box.d), sc(slantH), "SIDE", C.side);
        // Right Flap
        drawRect(sc(box.d) + sc(box.fw) / 2, 0, sc(box.fw), sc(slantH), "FLAP", C.sideFlap);
        ctx.restore();

        // Dimensions Lines?
        // Add basic total dims

        ctx.restore();
    }
}
