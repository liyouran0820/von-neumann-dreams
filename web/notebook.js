const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Both published notebook formats stay intact; malformed rows remain unobserved.
export function createNotebook(catalog, getStorage = () => globalThis.localStorage) {
  const levels = new Map(catalog.levels.map(level => [level.id, level]));
  const versioned = catalog.id === 'v2';
  let notes = {};

  function schemaFor(levelId, circuitId) {
    const level = levels.get(levelId);
    if (!level?.science || !catalog.notesKey) return null;
    if (level.schemaVersion !== 2) return circuitId === undefined ? { inputs: level.science.inputs } : null;
    const circuit = level.science.circuits.find(item => item.id === circuitId);
    return circuit ? { inputs: circuit.inputs, fields: [...new Set([...circuit.inputs.map(i => i.id), ...circuit.nodes.map(n => n.id), circuit.output])] } : null;
  }
  function validKey(schema, key) {
    return schema && typeof key === 'string' && key.length === schema.inputs.length && /^[01]*$/.test(key);
  }
  function normalize(value, schema) {
    if (schema.fields) {
      if (!isRecord(value) || !schema.fields.every(id => Object.hasOwn(value, id) && typeof value[id] === 'boolean')) return null;
      return Object.fromEntries(schema.fields.map(id => [id, value[id]]));
    }
    // Early optical notebooks stored only the output bit.
    if (typeof value === 'boolean') return { gate: value, door: value };
    if (!isRecord(value) || typeof value.gate !== 'boolean' || typeof value.door !== 'boolean') return null;
    if (Object.hasOwn(value, 'front') && typeof value.front !== 'boolean') return null;
    return { gate: value.gate, door: value.door, ...(Object.hasOwn(value, 'front') ? { front: value.front } : {}) };
  }
  function rowsFor(levelId, circuitId) {
    return circuitId === undefined ? notes[levelId] : notes[levelId]?.[circuitId];
  }
  function setRow(levelId, key, record, circuitId) {
    const levelNotes = notes[levelId] ??= {};
    const rows = circuitId === undefined ? levelNotes : levelNotes[circuitId] ??= {};
    rows[key] = record;
  }
  function loadRows(levelId, rows, circuitId) {
    const schema = schemaFor(levelId, circuitId);
    if (!schema || !isRecord(rows)) return;
    for (const [key, value] of Object.entries(rows)) {
      if (!validKey(schema, key)) continue;
      const record = normalize(value, schema);
      if (record) setRow(levelId, key, record, circuitId);
    }
  }

  try {
    const saved = catalog.notesKey ? JSON.parse(getStorage().getItem(catalog.notesKey)) : null;
    const source = versioned ? (saved?.format === 1 && saved?.catalog === catalog.id ? saved.levels : null) : saved;
    if (isRecord(source)) for (const level of catalog.levels) {
      if (!Object.hasOwn(source, level.id) || !isRecord(source[level.id])) continue;
      if (level.schemaVersion === 2) for (const circuit of level.science.circuits) loadRows(level.id, source[level.id][circuit.id], circuit.id);
      else loadRows(level.id, source[level.id]);
    }
  } catch { /* Obtaining Storage or parsing a save may fail; play stays available. */ }

  return {
    observation(levelId, key, circuitId) {
      if (!validKey(schemaFor(levelId, circuitId), key)) return undefined;
      const record = rowsFor(levelId, circuitId)?.[key];
      return record ? { ...record } : undefined;
    },
    observe(levelId, key, value, circuitId) {
      const schema = schemaFor(levelId, circuitId);
      if (!validKey(schema, key)) return;
      const record = normalize(value, schema);
      if (!record || JSON.stringify(rowsFor(levelId, circuitId)?.[key]) === JSON.stringify(record)) return;
      setRow(levelId, key, record, circuitId);
      try { getStorage().setItem(catalog.notesKey, JSON.stringify(versioned ? { format: 1, catalog: catalog.id, levels: notes } : notes)); }
      catch { /* Keep this session's observations in memory when storage is unavailable. */ }
    },
    clear() {
      notes = {};
      try { if (catalog.notesKey) getStorage().removeItem(catalog.notesKey); }
      catch { /* Clearing in-memory observations still succeeds. */ }
    },
  };
}
