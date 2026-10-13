extends RefCounted
## Pure millimetre geometry. AABB position_mm is its CENTER, size_mm is FULL
## width/height/depth. Fractional contact stops are rounded toward the start
## (e.g. x599.5 becomes x599 moving right), never through the contact plane.
## Bodies use the same box query; foot coordinates belong
## only to support_query. Sweeps stop the whole delta at first collision (no slide).
## Blocker: {id:String, position_mm:[int,int,int], size_mm:[positive int x3],
## active:bool}. Kind/visibility has no effect; player, box, wall are equal here.
## Minkowski separation depth <= 1 mm is legal contact; depth > 1 mm on all axes
## is overlap. Sweep resolves to the physical contact face, not a shrunken body.
## Surface: {id,type,source_id,world,active,height_mm,bounds_xz_mm:[xmin,xmax,zmin,zmax]}.
## Allowed support types: terrain, fixed_structure, real_bridge, ghost. Active
## must reflect committed lifecycle. Movable boxes are intentionally excluded.
## Returned surface is detached. Geometry never creates/removes objects or vetoes
## mapping deletion; absence of support is null, for the caller to handle falling.
const TOLERANCE_MM: int = 1
const SUPPORT_PRIORITY: Dictionary = {"terrain": 0, "fixed_structure": 1, "real_bridge": 2, "ghost": 3}

static func sweep_aabb(position_mm: Array, size_mm: Array, delta_mm: Array, blockers: Array[Dictionary], ignore_ids: Array = []) -> Dictionary:
	assert(_vector(position_mm) and _size(size_mm) and _vector(delta_mm), "Integer center/full size/delta required")
	var earliest: float = 1.0
	var ids: Array[String] = []
	for blocker: Dictionary in blockers:
		assert(_blocker(blocker), "Malformed blocker")
		if not blocker.active or blocker.id in ignore_ids:
			continue
		var limits: Array = _expanded_limits(size_mm, blocker)
		# The tolerance-shrunk interior answers whether this path genuinely enters
		# illegal overlap. The unshrunk interval supplies exact contact distance.
		var illegal: Dictionary = _slab(position_mm, delta_mm, limits, TOLERANCE_MM)
		if not illegal.hit:
			continue
		var contact: Dictionary = _slab(position_mm, delta_mm, limits, 0)
		var time: float = maxf(0.0, float(contact.enter))
		if time < earliest - 0.000000001:
			earliest = time
			ids = [str(blocker.id)]
		elif absf(time - earliest) <= 0.000000001:
			ids.append(str(blocker.id))
	ids.sort()
	var moved: Array[int] = []
	var position: Array[int] = []
	for axis: int in range(3):
		var amount: int = int(floor(absf(float(delta_mm[axis])) * earliest + 0.0000001)) * signi(delta_mm[axis])
		moved.append(amount)
		position.append(position_mm[axis] + amount)
	return {"position_mm": position, "delta_mm": moved, "blocked": not ids.is_empty(), "blocker_ids": ids}

static func generation_overlap(position_mm: Array, size_mm: Array, blockers: Array[Dictionary], ignore_ids: Array = []) -> Dictionary:
	assert(_vector(position_mm) and _size(size_mm), "Integer center/full size required")
	var ids: Array[String] = []
	for blocker: Dictionary in blockers:
		assert(_blocker(blocker), "Malformed blocker")
		if not blocker.active or blocker.id in ignore_ids:
			continue
		var overlaps: bool = true
		for axis: int in range(3):
			# Doubled coordinates preserve odd 450/451 mm sizes without rounding.
			# Minimum translation to separate, not intersection length: a tiny
			# contained box and a 1mm wall remain solid blocking volumes.
			var separation_depth_twice: int = size_mm[axis] + blocker.size_mm[axis] - 2 * absi(position_mm[axis] - blocker.position_mm[axis])
			if separation_depth_twice <= 2 * TOLERANCE_MM:
				overlaps = false
				break
		if overlaps:
			ids.append(str(blocker.id))
	ids.sort()
	return {"overlap": not ids.is_empty(), "blocker_ids": ids}

static func support_query(foot_mm: Array, surfaces: Array[Dictionary], world: String) -> Variant:
	assert(_vector(foot_mm) and world in ["night", "day"], "Integer foot and known world required")
	var candidates: Array[Dictionary] = []
	for surface: Dictionary in surfaces:
		assert(_surface(surface), "Malformed support surface")
		if not surface.active or surface.world != world or not SUPPORT_PRIORITY.has(surface.type):
			continue
		if abs(foot_mm[1] - surface.height_mm) > TOLERANCE_MM or not _within_xz(foot_mm, surface.bounds_xz_mm, TOLERANCE_MM):
			continue
		candidates.append(surface)
	if candidates.is_empty():
		return null
	# Nearest height, then real ground over ghost at shared edges; identity breaks
	# final ties. No insertion-order dependence and no world/level special case.
	candidates.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var da: int = abs(foot_mm[1] - a.height_mm)
		var db: int = abs(foot_mm[1] - b.height_mm)
		if da != db:
			return da < db
		if SUPPORT_PRIORITY[a.type] != SUPPORT_PRIORITY[b.type]:
			return SUPPORT_PRIORITY[a.type] < SUPPORT_PRIORITY[b.type]
		return str(a.id) < str(b.id)
	)
	return candidates[0].duplicate(true)

static func terrain_query(foot_mm: Array, terrain: Dictionary) -> Dictionary:
	## Shared terrain protocol only: finite shared_bounds_mm [xmin,xmax,zmin,zmax],
	## height_mm integer, holes array of XZ rectangles. It supplies no private-world
	## walls or bridges. Hole interiors remove ground; exact hole boundaries remain
	## land contact within the same 1 mm tolerance. Caller may convert land patches
	## to terrain support surfaces; no continuous floor is inserted under a hole.
	assert(_vector(foot_mm) and _bounds(terrain.get("shared_bounds_mm")) and typeof(terrain.get("height_mm")) == TYPE_INT and terrain.get("holes") is Array, "Malformed common terrain")
	var inside: bool = _within_xz(foot_mm, terrain.shared_bounds_mm, TOLERANCE_MM)
	var in_hole: bool = false
	for hole: Variant in terrain.holes:
		assert(_bounds(hole), "Malformed hole bounds")
		if foot_mm[0] > hole[0] + TOLERANCE_MM and foot_mm[0] < hole[1] - TOLERANCE_MM and foot_mm[2] > hole[2] + TOLERANCE_MM and foot_mm[2] < hole[3] - TOLERANCE_MM:
			in_hole = true
	return {"inside_bounds": inside, "in_hole": inside and in_hole, "solid": inside and not in_hole, "height_mm": terrain.height_mm}

static func _expanded_limits(size: Array, blocker: Dictionary) -> Array:
	var limits: Array = []
	for axis: int in range(3):
		limits.append([float(blocker.position_mm[axis]) - float(size[axis] + blocker.size_mm[axis]) / 2.0, float(blocker.position_mm[axis]) + float(size[axis] + blocker.size_mm[axis]) / 2.0])
	return limits

static func _slab(position: Array, delta: Array, limits: Array, tolerance: int) -> Dictionary:
	var enter: float = -INF
	var leave: float = INF
	for axis: int in range(3):
		var low: float = limits[axis][0] + tolerance
		var high: float = limits[axis][1] - tolerance
		if low >= high:
			return {"hit": false, "enter": 1.0}
		if delta[axis] == 0:
			if position[axis] <= low or position[axis] >= high:
				return {"hit": false, "enter": 1.0}
			continue
		var first: float = (low - position[axis]) / float(delta[axis])
		var last: float = (high - position[axis]) / float(delta[axis])
		enter = maxf(enter, minf(first, last))
		leave = minf(leave, maxf(first, last))
	return {"hit": leave > maxf(enter, 0.0) and enter < 1.0, "enter": enter}

static func _vector(value: Variant) -> bool:
	return value is Array and value.size() == 3 and typeof(value[0]) == TYPE_INT and typeof(value[1]) == TYPE_INT and typeof(value[2]) == TYPE_INT
static func _size(value: Variant) -> bool:
	return _vector(value) and value[0] > 0 and value[1] > 0 and value[2] > 0
static func _bounds(value: Variant) -> bool:
	if not value is Array or value.size() != 4:
		return false
	for v: Variant in value:
		if typeof(v) != TYPE_INT:
			return false
	return value[0] < value[1] and value[2] < value[3]
static func _within_xz(point: Array, bounds: Array, tolerance: int) -> bool:
	return point[0] >= bounds[0] - tolerance and point[0] <= bounds[1] + tolerance and point[2] >= bounds[2] - tolerance and point[2] <= bounds[3] + tolerance
static func _blocker(value: Dictionary) -> bool:
	return value.get("id") is String and not value.id.is_empty() and _vector(value.get("position_mm")) and _size(value.get("size_mm")) and value.get("active") is bool
static func _surface(value: Dictionary) -> bool:
	return value.get("id") is String and value.get("source_id") is String and value.get("world") in ["night", "day"] and value.get("type") is String and value.get("active") is bool and typeof(value.get("height_mm")) == TYPE_INT and _bounds(value.get("bounds_xz_mm"))
