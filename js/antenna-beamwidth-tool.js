const antennaSpecsFile =
  "https://ed94120.github.io/antenna-pattern-tool/data/antenna-specs.txt";

const defaultAntennaName = "Huawei_AOC4518R30V06";

let antennaData = {};

window.onload = init;

async function init() {
  try {
    setStatus("Chargement du fichier antenna-specs.txt…");

    const text = await loadAntennaSpecs();
    antennaData = parseAntennaSpecs(text);

    populateAntennaList();
    bindUI();

    setStatus(`${Object.keys(antennaData).length} antenne(s) chargée(s).`, false, true);
    updateDisplay();
  } catch (e) {
    setStatus(`Erreur : ${e?.message ?? e}`, true);
  }
}

async function loadAntennaSpecs() {
  const r = await fetch(antennaSpecsFile, { cache: "no-store" });

  if (!r.ok) {
    throw new Error(`chargement impossible, HTTP ${r.status}`);
  }

  return await r.text();
}

function bindUI() {
  document.getElementById("antennaSelect").addEventListener("change", updateDisplay);
}

function setStatus(msg, isError = false, isOk = false) {
  const el = document.getElementById("status");

  el.textContent = msg || "";
  el.className = "status";

  if (isError) el.classList.add("error");
  if (isOk) el.classList.add("ok");
}

function parseAntennaSpecs(text) {
  const result = {};
  const lines = text.split(/\r\n|\n|\r/);

  let currentName = null;
  let currentBlock = [];

  function saveCurrentBlock() {
    if (!currentName) return;

    const antenna = parseAntennaBlock(currentName, currentBlock);
    result[currentName] = antenna;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[ANTENNA]")) {
      saveCurrentBlock();
      currentName = line.substring("[ANTENNA]".length).trim();
      currentBlock = [];
      continue;
    }

    if (currentName) {
      currentBlock.push(rawLine);
    }
  }

  saveCurrentBlock();

  return result;
}

function parseAntennaBlock(name, blockLines) {
  const antenna = {
    name,
    type: "",
    beamwidth3dB: {},
    radome: {
      length: "",
      width: "",
      depth: ""
    },
    rawText: blockLines.join("\n").trim()
  };

  let azimuthMap = {};
  let elevationMap = {};

  for (const rawLine of blockLines) {
    const line = rawLine.trim();

    if (!line) continue;

    if (line.startsWith("Type :")) {
      antenna.type = getValueAfterColon(line);
    } else if (line.startsWith("Angle 3dB azimut :")) {
      azimuthMap = parseBandAngles(line);
    } else if (line.startsWith("Angle 3dB elevation :")) {
      elevationMap = parseBandAngles(line);
    } else if (line.startsWith("Longueur radome :")) {
      antenna.radome.length = getValueAfterColon(line);
    } else if (line.startsWith("Largeur radome :")) {
      antenna.radome.width = getValueAfterColon(line);
    } else if (line.startsWith("Epaisseur radome :")) {
      antenna.radome.depth = getValueAfterColon(line);
    }
  }

  antenna.beamwidth3dB = mergeBeamwidths(azimuthMap, elevationMap);

  return antenna;
}

function getValueAfterColon(line) {
  const idx = line.indexOf(":");
  if (idx < 0) return "";
  return line.substring(idx + 1).trim();
}

function parseBandAngles(line) {
  const result = {};
  const part = getValueAfterColon(line);

  const re = /Bande\s+([A-Za-z0-9_.-]+)\s+(-?\d+(?:[.,]\d+)?)\s*°/gi;

  let m;
  while ((m = re.exec(part)) !== null) {
    const band = m[1].trim();
    const value = Number(m[2].replace(",", "."));

    if (Number.isFinite(value)) {
      result[band] = value;
    }
  }

  return result;
}

function mergeBeamwidths(azimuthMap, elevationMap) {
  const bands = {};
  const bandNames = new Set([
    ...Object.keys(azimuthMap),
    ...Object.keys(elevationMap)
  ]);

  for (const bandName of bandNames) {
    bands[bandName] = {
      azimuth: azimuthMap[bandName] ?? null,
      elevation: elevationMap[bandName] ?? null
    };
  }

  return bands;
}

function populateAntennaList() {
  const select = document.getElementById("antennaSelect");
  select.innerHTML = "";

  const names = Object.keys(antennaData).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" })
  );

  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }

  if (antennaData[defaultAntennaName]) {
    select.value = defaultAntennaName;
  } else if (select.options.length > 0) {
    select.selectedIndex = 0;
  }
}

function updateDisplay() {
  const select = document.getElementById("antennaSelect");
  const name = select.value;
  const antenna = antennaData[name];

  const card = document.getElementById("resultCard");

  if (!antenna) {
    card.classList.add("hidden");
    setStatus("Aucune antenne sélectionnée.", true);
    return;
  }

  card.classList.remove("hidden");

  document.getElementById("antennaName").textContent = antenna.name;
  document.getElementById("antennaType").textContent = antenna.type || "—";

  renderBeamwidthTable(antenna);
  renderRadomeDimensions(antenna);
}

function renderBeamwidthTable(antenna) {
  const tbody = document.getElementById("beamwidthTableBody");
  tbody.innerHTML = "";

  const bands = antenna.beamwidth3dB;
  const bandNames = Object.keys(bands);

  if (bandNames.length === 0) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td colspan="3">Aucune ouverture à 3 dB renseignée.</td>
    `;

    tbody.appendChild(tr);
    return;
  }

  for (const bandName of bandNames) {
    const b = bands[bandName];

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(bandName)}</td>
      <td>${formatAngle(b.azimuth)}</td>
      <td>${formatAngle(b.elevation)}</td>
    `;

    tbody.appendChild(tr);
  }
}

function renderRadomeDimensions(antenna) {
  document.getElementById("radomeLength").textContent =
    formatTextValue(antenna.radome.length);

  document.getElementById("radomeWidth").textContent =
    formatTextValue(antenna.radome.width);

  document.getElementById("radomeDepth").textContent =
    formatTextValue(antenna.radome.depth);
}

function formatAngle(v) {
  if (!Number.isFinite(v)) return "—";
  return `${formatNumber(v)}°`;
}

function formatNumber(v) {
  if (Math.abs(v - Math.round(v)) < 1e-9) {
    return String(Math.round(v));
  }

  return String(Number(v.toFixed(3)));
}

function formatTextValue(v) {
  const s = (v ?? "").trim();

  if (!s) return "—";
  if (/^non renseign[ée]e?$/i.test(s)) return "—";

  return s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[c]
  ));
}
