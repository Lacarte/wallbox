# Wall-Mounted Box Visualizer - Project Overview & Handover

## Project Goal
Interactive 3D web application to visualize a trapezoidal wall-mounted box. The app demonstrates the assembly process, transitioning from a Flat 2D Pattern (Open) to a 3D Assembled Box (Closed).

## File Structure & Responsibilities

### 1. Core Application
**index.html**
- Details: Main UI structure. Contains the 3D canvas container (#canvas-container) and the control panel sidebar. Loads Three.js from CDN.
- Features:
  - Responsive layout with 3D canvas and control panel
  - Dimension sliders for real-time customization
  - Assembly progress slider (0% = Flat, 100% = Assembled)
  - View controls (camera reset, wireframe, grid toggle, auto-rotate)
  - Specification display showing calculated dimensions

**app.js**
- Role: Orchestrator.
- Current Logic:
  - Initializes Three.js Scene, Camera, Renderer.
  - Manages the unfold slider. Important: The slider logic was updated to represent "Box Assembly".
  - 0%: Fully Open (Flat Pattern).
  - 100%: Fully Closed (Assembled Box).
  - Note: The FlatPatternRenderer overlay has been DISABLED in favor of the pure 3D view transition.
- Key Features:
  - Event listeners for UI controls
  - Geometry updates based on dimension changes
  - Real-time specification calculations
  - Camera controls with orbit functionality

### 2. 3D Geometry (box-geometry.js)
**TrapezoidBox Class:**
- Hierarchy: Implements a strict parent-child hierarchy for correct articulation.
  - Back (Root Panel)
  - Lid -> LidFlap
  - Bottom -> BottomFlap
  - Left (Side) -> LeftFlap
  - Right (Side) -> RightFlap
- Pivots: Geometry is carefully offset (using translate) so that the mesh origin (0,0,0) aligns perfectly with the Hinge Edge. This simplifies rotation logic significantly.
- Flap Orientation: Flaps are attached to the outer edges of their parent panels.
- Features:
  - Dynamic dimension updates
  - Color-coded panels for easy identification
  - Edge highlighting for better visualization
  - Panel labels for educational purposes

### 3. Animation Logic (animation.js)
**UnfoldController Class:**
- Role: Controls the closing/opening sequence.
- Logic:
  - Global Pivots: Rotates the main panels (Lid, Bottom, Left, Right) around the Back panel's edges.
  - Direction: Panels swing INWARDS (Forward/Z+) to close.
  - Flap Tucking: Flaps rotate from 0 (Flat) to +/- 90 degrees (Tucked).
    - Lid Flap: Rotates +90 (Down/In).
    - Bottom Flap: Rotates -90 (Up/In).
    - Side Flaps: Rotate -/+90 (Inwards).
  - Camera: Includes logic to transition the view, though the primary focus is now the object animation.
- Key Functions:
  - saveRestPose(): Saves initial positions for animation reset
  - update(): Updates animation based on progress value
  - rotateAroundPivot(): Helper for complex rotations

### 4. 2D Pattern Visualization (flat-pattern.js)
**FlatPatternRenderer Class:**
- Role: Renders the 2D technical drawing overlay on top of the 3D canvas
- Features:
  - Canvas-based 2D rendering
  - Responsive design that adapts to window size
  - Accurate geometric representation of unfolded box
  - Color-coded panels matching 3D visualization
  - Dimensional accuracy for technical drawing purposes
- Note: Currently disabled in favor of pure 3D view

### 5. Utilities (utils.js)
- Easing functions for smooth animation (linear, cubic ease in/out, quadratic ease out)
- Helper functions: lerp (linear interpolation), clamp, degToRad, smoothStep
- Mathematical utilities for animation calculations

### 6. Styling (styles.css)
- Responsive design with CSS Grid layout
- Modern UI with gradient backgrounds and card-based controls
- Custom styling for sliders, buttons, and control elements
- Mobile-responsive layout adjustments
- Color scheme with primary, secondary, and accent colors

## Handover Notes for Next Agent

### IMPORTANT
Animation Direction: The user recently reversed the animation semantics. Ensure any new logic respects that 0 = Open (Flat) and 100 = Closed.

### NOTE
Pivot Math: The Side Panels (Left/Right) use calculated vectors to align with the trapezoidal back panel. If you modify the Back geometry (e.g. changing the trapezoid shape significantly), verify the rotational axis in animation.js still aligns with the new edge vector.

### TIP
Flap Tucking: The flap rotation signs (+/-) are critical for visual correctness. Lid folds DOWN (+X), Bottom folds UP (-X).

## Current Status
- ✅ Geometry: Correctly parented and hinged.
- ✅ Animation: "Closing" sequence implemented. Flaps tuck in correctly.
- ✅ Visualization: 2D Overlay removed; pure 3D transition used.
- ⚠️ Pending: Fine-tuning of the "Flat Layout" positioning (spread) if the user wants strictly non-overlapping 2D view (currently animation.js has legacy logic for applyFlatLayout which might need re-enabling/tweaking if they want a diagram mode).

## Potential Enhancements
- Interactive 3D manipulation of the box
- Export functionality for technical drawings
- Additional box styles and configurations
- Animation speed controls
- More detailed specifications and measurements
- Print-friendly view for technical documentation