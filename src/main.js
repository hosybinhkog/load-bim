import * as THREE from "three";
import * as OBC from "openbim-components";
import * as dat from "lil-gui";
import * as WEBIFC from "web-ifc";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

const container = document.getElementById("container");
const gui = new dat.GUI();

const components = new OBC.Components();

components.scene = new OBC.SimpleScene(components);
components.renderer = new OBC.PostproductionRenderer(components, container);
components.camera = new OBC.SimpleCamera(components);
components.raycaster = new OBC.SimpleRaycaster(components);

components.init();
components.renderer.postproduction.enabled = true;

// const mainToolbar = new OBC.Toolbar(components);
// mainToolbar.name = "Main toolbar";
// components.ui.addToolbar(mainToolbar);

const scene = components.scene.get();
const camera = components.camera.get();
// components.camera.controls.setLookAt(12, 6, 8, 0, 0, -10);

components.scene.setup();

let renderer = components._renderer._renderer;
// renderer.render(scene, camera)

var plyLoader = new PLYLoader();
let fragments = new OBC.FragmentManager(components);
let fragmentIfcLoader = new OBC.FragmentIfcLoader(components);
const highlighter = new OBC.FragmentHighlighter(components, fragments);

fragmentIfcLoader.settings.wasm = {
  path: "https://unpkg.com/web-ifc@0.0.44/",
  absolute: true,
};
highlighter.update();
components.renderer.postproduction.customEffects.outlineEnabled = true;
highlighter.outlinesEnabled = true;

const excludedCats = [
  WEBIFC.IFCTENDONANCHOR,
  WEBIFC.IFCREINFORCINGBAR,
  WEBIFC.IFCREINFORCINGELEMENT,
];

for (const cat of excludedCats) {
  fragmentIfcLoader.settings.excludedCategories.add(cat);
}

fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
fragmentIfcLoader.settings.webIfc.OPTIMIZE_PROFILES = true;

const directionalLight = new THREE.DirectionalLight();
directionalLight.position.set(5, 10, 3);
directionalLight.intensity = 0.5;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight();
ambientLight.intensity = 0.5;
scene.add(ambientLight);

// const grid = new OBC.SimpleGrid(components);
// components.tools.add('grid', grid);
// const customEffects = components.renderer.postproduction.customEffects;
// customEffects.excludedMeshes.push(grid.get());

const highlightMaterial = new THREE.MeshBasicMaterial({
  color: "#BCF124",
  depthTest: false,
  opacity: 0.8,
  transparent: true,
});

highlighter.add("default", highlightMaterial);
highlighter.outlineMaterial.color.set(0xf0ff7a);

async function loadIfcAsFragments() {
  const file = await fetch("/Duplex_A_20110907.ifc");
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  const model = await fragmentIfcLoader.load(buffer, "myifc");
  console.log(model);
  scene.add(model);

  gui.add(model, "visible").name("show bim");
}

function loadPLY() {
  plyLoader.load("/Duplex_A_20110907.ply", function (geometry) {
    const material = new THREE.PointsMaterial({
      size: 0.1,
      depthWrite: true,
      depthTest: true,
    });
    material.vertexColors = true;
    const mesh = new THREE.Points(geometry, material);
    mesh.rotation.x += -Math.PI * 0.5;

    scene.add(mesh);
    const tfControl = new TransformControls(camera, renderer.domElement);
    tfControl.setSize(0.5);
    tfControl.addEventListener("dragging-changed", function (event) {
      components.camera.controls.enabled = !event.value;
    });
    tfControl.attach(mesh);
    scene.add(tfControl);
    mesh.position.x = -8.331974467885479;
    mesh.position.y = -2.588762760779156;
    mesh.position.z = -11.952101154993713;
    gui.add(tfControl, "visible").name("show ply control");
    gui.add(mesh, "visible").name("show ply");
  });
}
let lastSelection;

let singleSelection = {
  value: true,
};
async function highlightOnClick(event) {
  const result = await highlighter.highlight("default", singleSelection.value);
  if (result) {
    lastSelection = {};
    for (const fragment of result.fragments) {
      const fragmentID = fragment.id;
      lastSelection[fragmentID] = [result.id];
    }
  }
}

container.addEventListener("click", (event) => highlightOnClick(event));

const settings = {
  loadFragments: () => loadIfcAsFragments(),
  exportFragments: () => exportFragments(),
  disposeFragments: () => disposeFragments(),
  loadPLY: () => loadPLY(),
};

gui.add(settings, "loadFragments").name("load BIM");
gui.add(settings, "loadPLY").name("load PLY");
// gui.add(settings, 'exportFragments').name('Export fragments');
// gui.add(settings, 'disposeFragments').name('Dispose fragments');
