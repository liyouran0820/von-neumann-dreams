extends Control
## P00 startup only: isolated empty worlds and measured renderer diagnostics.
## No rules, level geometry, input commands, or U03 visual acceptance live here.

const EXPECTED_VERSION: String = "4.7.2.stable.official.ed1daf0bf"
var _views: Array[SubViewport] = []
var _environments: Array[Environment] = []
var _cameras: Array[Camera3D] = []
var _report_path: String = ""
var _quit_frames: int = 0
var _frames: int = 0
var _reported: bool = false
var _status: Label

func _ready() -> void:
	for argument: String in OS.get_cmdline_user_args():
		if argument.begins_with("--p00-report="):
			_report_path = argument.trim_prefix("--p00-report=")
		elif argument.begins_with("--quit-after-frames="):
			_quit_frames = maxi(3, argument.trim_prefix("--quit-after-frames=").to_int())
	var split: HBoxContainer = HBoxContainer.new()
	split.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	split.add_theme_constant_override("separation", 0)
	add_child(split)
	_create_world(split, "Day", Color("cdc7bd"))
	_create_world(split, "Night", Color("18243b"))
	_status = Label.new()
	_status.text = "P00 / Native bootstrap — empty isolated worlds; visual acceptance pending"
	_status.position = Vector2(24, 24)
	_status.add_theme_color_override("font_color", Color.WHITE)
	_status.add_theme_font_size_override("font_size", 20)
	_status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_status)

func _create_world(parent: HBoxContainer, title: String, background: Color) -> void:
	var container: SubViewportContainer = SubViewportContainer.new()
	container.name = title + "Container"
	container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	container.stretch = true
	container.stretch_shrink = 1
	parent.add_child(container)
	var viewport: SubViewport = SubViewport.new()
	viewport.name = title + "Viewport"
	viewport.own_world_3d = true
	viewport.world_3d = World3D.new()
	viewport.msaa_3d = Viewport.MSAA_4X
	viewport.scaling_3d_scale = 1.0
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	container.add_child(viewport)
	_views.append(viewport)
	var environment: Environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = background
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.tonemap_exposure = 1.0
	environment.ssao_enabled = true
	environment.glow_enabled = true
	environment.glow_intensity = 0.2
	var world_environment: WorldEnvironment = WorldEnvironment.new()
	world_environment.environment = environment
	viewport.add_child(world_environment)
	_environments.append(environment)
	var attributes: CameraAttributesPractical = CameraAttributesPractical.new()
	attributes.auto_exposure_enabled = false
	attributes.exposure_multiplier = 1.0
	attributes.dof_blur_far_enabled = false
	attributes.dof_blur_near_enabled = false
	var camera: Camera3D = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 12.0
	camera.position = Vector3(10.0, 10.0, 10.0)
	camera.rotation_degrees = Vector3(-35.2643897, 45.0, 0.0)
	camera.environment = environment
	camera.attributes = attributes
	viewport.add_child(camera)
	camera.current = true
	_cameras.append(camera)

func _process(_delta: float) -> void:
	_frames += 1
	if _frames == 3:
		_write_report()
	if _quit_frames > 0 and _frames >= _quit_frames:
		get_tree().quit(0)

func _write_report() -> void:
	if _reported:
		return
	_reported = true
	var headless: bool = DisplayServer.get_name() == "headless"
	var method: String = RenderingServer.get_current_rendering_method()
	var driver: String = RenderingServer.get_current_rendering_driver_name()
	var version_info: Dictionary = Engine.get_version_info()
	var version: String = "%s.%s.%s.%s.%s.%s" % [version_info.get("major"), version_info.get("minor"), version_info.get("patch"), version_info.get("status"), version_info.get("build"), str(version_info.get("hash", "")).left(9)]
	var valid_backend: bool = method == "forward_plus" and driver == "metal"
	var errors: Array[String] = []
	if version != EXPECTED_VERSION:
		errors.append("Engine version differs from locked baseline: " + version)
	if not headless and not valid_backend:
		errors.append("Required Forward+/Metal unavailable: " + method + "/" + driver)
	var viewport_reports: Array[Dictionary] = []
	for index: int in range(_views.size()):
		var viewport: SubViewport = _views[index]
		var attributes: CameraAttributesPractical = _cameras[index].attributes as CameraAttributesPractical
		viewport_reports.append({
			"name": viewport.name, "size": [viewport.size.x, viewport.size.y],
			"world_instance_id": viewport.find_world_3d().get_instance_id(),
			"msaa_3d_enum": viewport.msaa_3d, "msaa_samples": 4 if viewport.msaa_3d == Viewport.MSAA_4X else -1,
			"scaling_3d_scale": viewport.scaling_3d_scale,
			"ssao_enabled": _environments[index].ssao_enabled,
			"glow_enabled": _environments[index].glow_enabled,
			"fixed_exposure": _environments[index].tonemap_exposure,
			"auto_exposure_enabled": attributes.auto_exposure_enabled,
			"camera_rotation_degrees": [_cameras[index].rotation_degrees.x, _cameras[index].rotation_degrees.y, _cameras[index].rotation_degrees.z],
		})
	var window_size: Vector2i = DisplayServer.window_get_size()
	var report: Dictionary = {
		"schema": "night-white-p00-runtime-v1", "engine_version": version, "engine_version_info": version_info,
		"headless": headless, "rendering_method": method, "rendering_driver": driver,
		"device_name": RenderingServer.get_video_adapter_name(),
		"device_vendor": RenderingServer.get_video_adapter_vendor(),
		"api_version": RenderingServer.get_video_adapter_api_version(),
		"display_server": DisplayServer.get_name(),
		"window_size": [window_size.x, window_size.y],
		"root_viewport_size": [get_viewport_rect().size.x, get_viewport_rect().size.y],
		"physics_ticks_per_second": Engine.physics_ticks_per_second,
		"max_fps": Engine.max_fps, "process_frames_at_probe": _frames,
		"viewports": viewport_reports,
		"independent_worlds": _views[0].find_world_3d() != _views[1].find_world_3d(),
		"renderer_check": "NOT_RUN_HEADLESS" if headless else ("MATCH" if valid_backend else "MISMATCH"),
		"visual_acceptance": "NOT_RUN", "errors": errors,
	}
	if FileAccess.file_exists("res://build_info.json"):
		report["build_info"] = JSON.parse_string(FileAccess.get_file_as_string("res://build_info.json"))
	var text: String = JSON.stringify(report, "\t")
	print("P00_RUNTIME_REPORT\n" + text)
	if not _report_path.is_empty():
		var file: FileAccess = FileAccess.open(_report_path, FileAccess.WRITE)
		if file == null:
			errors.append("Cannot write report: " + str(FileAccess.get_open_error()))
		else:
			file.store_string(text + "\n")
	if not errors.is_empty():
		_status.text = "P00 ERROR / " + "; ".join(errors)
		for error: String in errors:
			push_error(error)
		get_tree().quit(2)
