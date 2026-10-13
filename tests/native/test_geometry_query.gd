extends RefCounted
const G = preload("res://src/domain/geometry_query.gd")
var results: Array[Dictionary] = []
func check(id: String, condition: bool, expected: Variant, actual: Variant) -> void:
	results.append({"id": id, "expected": expected, "actual": actual, "status": "PASS" if condition else "FAIL"})
func blocker(id: String, center: Array, size: Array) -> Dictionary:
	return {"id": id, "position_mm": center, "size_mm": size, "active": true}
func surface(id: String, kind: String, bounds: Array, height: int = 0, world: String = "night", active: bool = true) -> Dictionary:
	return {"id": id, "type": kind, "source_id": id, "world": world, "active": active, "height_mm": height, "bounds_xz_mm": bounds}
func run() -> Array[Dictionary]:
	var wall: Dictionary = blocker("thin", [1000, 0, 0], [20, 2000, 2000])
	var r: Dictionary = G.sweep_aabb([0, 0, 0], [800, 800, 800], [3000, 0, 0], [wall])
	check("GEO-THIN-PATH", r.position_mm == [590, 0, 0] and r.blocked, [590, 0, 0], r)
	r = G.sweep_aabb([590, 0, 0], [800, 800, 800], [-100, 0, 0], [wall])
	check("GEO-TOUCH-LEAVE", r.position_mm == [490, 0, 0] and not r.blocked, [490, 0, 0], r)
	r = G.sweep_aabb([590, 0, 0], [800, 800, 800], [100, 0, 0], [wall])
	check("GEO-TOUCH-ENTER", r.position_mm == [590, 0, 0] and r.blocked, [590, 0, 0], r)
	r = G.sweep_aabb([2000, 0, 0], [800, 800, 800], [-3000, 0, 0], [wall])
	check("GEO-NEGATIVE", r.position_mm == [1410, 0, 0], [1410, 0, 0], r)
	r = G.sweep_aabb([0, 2000, 0], [450, 450, 450], [0, -4000, 0], [blocker("floor", [0, -50, 0], [4000, 100, 4000])])
	check("GEO-VERTICAL", r.position_mm == [0, 225, 0], [0, 225, 0], r)
	var walls: Array[Dictionary] = [blocker("x", [1000, 0, 0], [20, 4000, 4000]), blocker("z", [0, 0, 1500], [4000, 4000, 20])]
	r = G.sweep_aabb([0, 0, 0], [800, 800, 800], [2000, 0, 2000], walls)
	check("GEO-DIAGONAL-FIRST", r.position_mm == [590, 0, 590] and r.blocker_ids == ["x"], [590, 0, 590], r)
	walls.reverse()
	check("GEO-ORDER", G.sweep_aabb([0, 0, 0], [800, 800, 800], [2000, 0, 2000], walls) == r, "same result after reverse", r)
	r = G.sweep_aabb([0, 0, 0], [450, 450, 450], [2000, 0, 0], [wall])
	check("GEO-BODY-WIDTH", r.position_mm == [765, 0, 0], "450 mm body stops at x765", r)
	r = G.sweep_aabb([0, 0, 0], [800, 800, 800], [3000, 0, 0], [wall], ["thin"])
	check("GEO-IGNORE", not r.blocked and r.position_mm == [3000, 0, 0], [3000, 0, 0], r)
	for x: int in [590, 591, 592]:
		var overlap: Dictionary = G.generation_overlap([x, 0, 0], [800, 800, 800], [wall])
		check("GEO-TOLERANCE-" + str(x), overlap.overlap == (x == 592), "touch/1mm legal; 2mm overlap", overlap)
	var pads: Array[Dictionary] = [surface("ghost-C", "ghost", [14000, 16000, 2000, 4000]), surface("shore", "terrain", [16000, 20000, 1000, 6000])]
	for z: int in [2500, 3500]:
		var found: Variant = G.support_query([15500, 0, z], pads, "night")
		check("GEO-BRIDGE-WIDTH-" + str(z), found != null and found.id == "ghost-C", "ghost-C supports both lanes", found)
	check("GEO-SHORE-PRIORITY", G.support_query([16000, 0, 3000], pads, "night").id == "shore", "terrain wins shared boundary", G.support_query([16000, 0, 3000], pads, "night"))
	pads.reverse()
	check("GEO-SUPPORT-ORDER", G.support_query([16000, 0, 3000], pads, "night").id == "shore", "terrain independent of order", G.support_query([16000, 0, 3000], pads, "night"))
	check("GEO-SHORE-NOT-GHOST", G.support_query([16500, 0, 3000], pads, "night").id == "shore", "shore is not ghost support", G.support_query([16500, 0, 3000], pads, "night"))
	for point: Array in [[13000, 0, 3000], [15500, 2, 3000], [15500, -2, 3000]]:
		check("GEO-SUPPORT-BOUNDS-" + str(point), G.support_query(point, pads, "night") == null, "outside XZ or height returns null", G.support_query(point, pads, "night"))
	check("GEO-WORLD", G.support_query([15500, 0, 3000], pads, "day") == null, "other world cannot support", null)
	check("GEO-GHOST-INACTIVE", G.support_query([15500, 0, 3000], [surface("C", "ghost", [14000, 16000, 2000, 4000], 0, "night", false)], "night") == null, "inactive ghost cannot support", null)
	check("GEO-NO-STACKING", G.support_query([0, 0, 0], [surface("box", "movable_box", [-400, 400, -400, 400])], "night") == null, "movable box cannot provide standing support", null)
	var terrain: Dictionary = {"shared_bounds_mm": [0, 20000, 0, 6000], "holes": [[6000, 8000, 0, 6000]], "height_mm": 0}
	check("GEO-TERRAIN-HOLE", not G.terrain_query([7000, 0, 3000], terrain).solid, "hole has no terrain", G.terrain_query([7000, 0, 3000], terrain))
	check("GEO-TERRAIN-LAND", G.terrain_query([5000, 0, 3000], terrain).solid, "shared bounds land exists", G.terrain_query([5000, 0, 3000], terrain))
	check("GEO-TERRAIN-OUTSIDE", not G.terrain_query([-20, 0, 3000], terrain).inside_bounds, "outside shared extent", G.terrain_query([-20, 0, 3000], terrain))
	for kind: String in ["box", "player"]:
		var obstacle: Dictionary = blocker(kind, [1000, 0, 0], [450, 1000, 450])
		var hit: Dictionary = G.sweep_aabb([0, 0, 0], [800, 800, 800], [3000, 0, 0], [obstacle])
		check("GEO-BLOCKER-" + kind.to_upper(), hit.position_mm == [375, 0, 0], "box/player path collision x375", hit)
	for amount: int in [1, 2]:
		var hit: Dictionary = G.sweep_aabb([590, 0, 0], [800, 800, 800], [amount, 0, 0], [wall])
		check("GEO-SWEEP-TOLERANCE-" + str(amount), hit.blocked == (amount == 2) and hit.position_mm[0] == (590 if amount == 2 else 591), "1mm contact allowed; 2mm attempted penetration stops at face", hit)
	var duplicate_time: Array[Dictionary] = [blocker("z", [1000, 0, 0], [20, 2000, 2000]), blocker("a", [1000, 0, 0], [20, 2000, 2000])]
	var tied: Dictionary = G.sweep_aabb([0, 0, 0], [800, 800, 800], [3000, 0, 0], duplicate_time)
	check("GEO-SIMULTANEOUS-IDS", tied.blocker_ids == ["a", "z"], "simultaneous IDs sorted", tied)
	var tangent: Dictionary = G.sweep_aabb([590, 0, 0], [800, 800, 800], [0, 0, 100], [wall])
	check("GEO-TANGENT", not tangent.blocked and tangent.position_mm == [590, 0, 100], "tangential motion along face remains legal", tangent)
	var inactive: Dictionary = wall.duplicate(true)
	inactive.active = false
	check("GEO-INACTIVE-BLOCKER", not G.sweep_aabb([0, 0, 0], [800, 800, 800], [3000, 0, 0], [inactive]).blocked, "inactive obstacle ignored", inactive)
	for height: int in [-1, 1]:
		check("GEO-SUPPORT-TOLERANCE-" + str(height), G.support_query([15500, height, 3000], pads, "night") != null, "1mm vertical contact tolerance", height)
	var detached: Dictionary = G.support_query([15500, 0, 3000], pads, "night")
	detached.bounds_xz_mm[0] = 99
	check("GEO-SUPPORT-COPY", G.support_query([15500, 0, 3000], pads, "night").bounds_xz_mm[0] == 14000, "returned surface cannot mutate source", detached)
	var ceiling: Array[Dictionary] = [surface("above", "fixed_structure", [-1000, 1000, -1000, 1000], 1000)]
	check("GEO-NO-UPPER-SUPPORT", G.support_query([0, 0, 0], ceiling, "night") == null, "surface one metre above is not support", null)
	var tolerance_sheet: Dictionary = blocker("sheet", [1000, 0, 0], [1, 2000, 2000])
	var sheet_sweep: Dictionary = G.sweep_aabb([0, 0, 0], [800, 800, 800], [3000, 0, 0], [tolerance_sheet])
	check("GEO-TOLERANCE-THICK-SHAPE", sheet_sweep.blocked and sheet_sweep.position_mm == [599, 0, 0] and G.generation_overlap([1000, 0, 0], [800, 800, 800], [tolerance_sheet]).overlap, "1mm wall blocks at conservative integer x599; centered containment overlaps", sheet_sweep)
	var contained: Dictionary = G.generation_overlap([1000, 0, 0], [1, 1, 1], [wall])
	check("GEO-CONTAINED-SMALL", contained.overlap, "contained 1mm object requires separation and overlaps", contained)
	return results
