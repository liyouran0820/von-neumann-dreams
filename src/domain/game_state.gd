extends RefCounted
## Owned pure-data snapshot. Candidates may be edited then replaced; StateCodec
## is the validation boundary before serialized state is accepted or hashed.
var _snapshot: Dictionary = {}

func _init(snapshot: Dictionary = {}) -> void:
	_snapshot = snapshot.duplicate(true)

func read_snapshot() -> Dictionary:
	return _snapshot.duplicate(true)

func replace_snapshot(snapshot: Dictionary) -> void:
	_snapshot = snapshot.duplicate(true)

func clone() -> RefCounted:
	return get_script().new(read_snapshot())
