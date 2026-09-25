extends Control

const TILE := 96.0
const MOVE_TIME := 0.14
const ATLAS := preload("res://assets/terrain-atlas-v1.png")
const BUILDINGS := ["BUILD_MARKER", "BUILD_HEARTH", "BUILD_WORKSHOP", "BUILD_BRIDGE", "BUILD_RECOVERY"]
const BUILD_NAMES := ["Balise", "Foyer", "Atelier", "Pont", "Reprise"]
const BUILD_COSTS := ["1 bois · 1 pierre", "1 bois · 1 fibre", "2 bois · 1 pierre", "2 bois · 1 pierre", "1 bois · 2 fibres"]

var state: Dictionary = {}
var visual_player := Vector2(4, 5)
var move_from := Vector2(4, 5)
var move_to := Vector2(4, 5)
var move_progress := 1.0
var facing := Vector2.RIGHT
var selected_build := -1
var toast := ""
var toast_kind := "observed"
var toast_time := 0.0
var fatal_error := ""
var ambient_accumulator := 0.0
var command_busy := false

func _ready() -> void:
	set_process(true)
	set_process_input(true)
	request_state("")
	call_deferred("grab_focus")

func _process(delta: float) -> void:
	if move_progress < 1.0:
		move_progress = minf(1.0, move_progress + delta / MOVE_TIME)
		visual_player = move_from.lerp(move_to, ease(move_progress, -1.8))
	elif not command_busy:
		var held := held_move_command()
		if held != "":
			request_state(held)
	ambient_accumulator += delta
	if ambient_accumulator >= 1.4 and move_progress >= 1.0 and not command_busy:
		ambient_accumulator = 0.0
		request_state("WAIT_1", true)
	if toast_time > 0.0:
		toast_time = maxf(0.0, toast_time - delta)
	queue_redraw()

func held_move_command() -> String:
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_Z) or Input.is_key_pressed(KEY_UP):
		facing = Vector2.UP
		return "UP"
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		facing = Vector2.RIGHT
		return "RIGHT"
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		facing = Vector2.DOWN
		return "DOWN"
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_Q) or Input.is_key_pressed(KEY_LEFT):
		facing = Vector2.LEFT
		return "LEFT"
	return ""

func _input(event: InputEvent) -> void:
	if fatal_error != "":
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var command := ""
		match event.physical_keycode:
			KEY_W, KEY_Z, KEY_UP:
				facing = Vector2.UP
				command = "UP"
			KEY_D, KEY_RIGHT:
				facing = Vector2.RIGHT
				command = "RIGHT"
			KEY_S, KEY_DOWN:
				facing = Vector2.DOWN
				command = "DOWN"
			KEY_A, KEY_Q, KEY_LEFT:
				facing = Vector2.LEFT
				command = "LEFT"
			KEY_E, KEY_SPACE:
				command = BUILDINGS[selected_build] if selected_build >= 0 else "INTERACT"
			KEY_ESCAPE:
				selected_build = -1
			KEY_1, KEY_2, KEY_3, KEY_4, KEY_5:
				selected_build = int(event.physical_keycode - KEY_1)
		if command != "" and move_progress >= 1.0:
			get_viewport().set_input_as_handled()
			request_state(command)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var first_x := size.x / 2.0 - 285.0
		if event.position.y >= size.y - 82.0 and event.position.y <= size.y - 18.0:
			var index := int(floor((event.position.x - first_x) / 114.0))
			if index >= 0 and index < BUILDINGS.size():
				selected_build = index
				queue_redraw()

func request_state(command: String, ambient := false) -> void:
	command_busy = true
	var core_path := ProjectSettings.globalize_path("res://../dist/CORPUS-Monde-vivant")
	var save_dir := ProjectSettings.globalize_path("user://worlds")
	DirAccess.make_dir_recursive_absolute(save_dir)
	var save_path := save_dir.path_join("monde-principal.save")
	if not FileAccess.file_exists(core_path):
		fatal_error = "Le moteur du monde est absent. Lance package.sh puis relance le jeu."
		command_busy = false
		return
	var arguments := PackedStringArray(["--machine", "--save", save_path])
	if command != "":
		arguments.append_array(PackedStringArray(["--command", command]))
	var output: Array = []
	var exit_code := OS.execute(core_path, arguments, output, true, false)
	var payload := "".join(output).strip_edges()
	var parsed = JSON.parse_string(payload)
	if exit_code != 0 or not parsed is Dictionary or not parsed.get("ok", false):
		fatal_error = "Le moteur du monde ne répond plus.\n" + payload.left(240)
		command_busy = false
		return
	var old_position := visual_player
	state = parsed
	move_from = old_position
	move_to = Vector2(float(state.player.x), float(state.player.y))
	if move_to != old_position:
		move_progress = 0.0
	else:
		move_progress = 1.0
	if not ambient:
		var outcome = state.get("outcome")
		if outcome is Dictionary:
			toast = outcome.message
			toast_kind = outcome.kind
			toast_time = 3.2
		if command.begins_with("BUILD_") and toast_kind == "changed":
			selected_build = -1
	command_busy = false
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("09100c"))
	if fatal_error != "":
		draw_centered_text(fatal_error, size / 2.0, 22, Color("e07964"))
		return
	if state.is_empty():
		draw_centered_text("Le monde se rassemble…", size / 2.0, 22, Color("ece2c8"))
		return
	var camera := size / 2.0 - (visual_player + Vector2(0.5, 0.5)) * TILE
	draw_terrain(camera)
	draw_world_objects(camera)
	draw_player(camera)
	draw_light_and_weather()
	draw_context(camera)
	draw_hud()

func draw_terrain(camera: Vector2) -> void:
	for cell in state.cells:
		var rect := Rect2(camera + Vector2(float(cell.x), float(cell.y)) * TILE, Vector2(TILE + 1, TILE + 1))
		if not rect.intersects(Rect2(Vector2.ZERO, size)):
			continue
		if not cell.visible:
			draw_rect(rect, Color("0e1712"))
			for stripe in range(-1, 3):
				draw_line(rect.position + Vector2(stripe * 50, 0), rect.position + Vector2(stripe * 50 + TILE, TILE), Color(0.13, 0.18, 0.14, 0.45), 2)
			continue
		var source := terrain_source(cell.terrain)
		draw_texture_rect_region(ATLAS, rect, source)
		if cell.path == "trail" or cell.path == "road":
			var width := 18.0 if cell.path == "trail" else 34.0
			draw_line(rect.position + Vector2(0, TILE / 2), rect.position + Vector2(TILE, TILE / 2), Color(0.62, 0.47, 0.26, 0.88), width)
		draw_rect(rect, Color(0.02, 0.03, 0.02, 0.18), false, 1)

func terrain_source(kind: String) -> Rect2:
	match kind:
		"path": return Rect2(512, 0, 512, 512)
		"water": return Rect2(0, 512, 512, 512)
		"cliff": return Rect2(512, 512, 512, 512)
		_: return Rect2(0, 0, 512, 512)

func draw_world_objects(camera: Vector2) -> void:
	for resource in state.resources:
		draw_resource(resource, camera)
	for structure in state.structures:
		draw_structure(structure, camera)
	for resident in state.residents:
		draw_resident(resident, camera)

func world_center(data: Dictionary, camera: Vector2) -> Vector2:
	return camera + (Vector2(float(data.x), float(data.y)) + Vector2(0.5, 0.5)) * TILE

func draw_resource(resource: Dictionary, camera: Vector2) -> void:
	var p := world_center(resource, camera)
	var exhausted: bool = resource.state == "exhausted"
	if resource.kind == "bois":
		draw_ellipse_shadow(p, Vector2(27, 12))
		draw_rect(Rect2(p + Vector2(-5, 4), Vector2(10, 28)), Color("60452e"))
		var leaf: Color = Color("843f38") if exhausted else Color("426d3d")
		draw_circle(p + Vector2(-13, -5), 20, leaf)
		draw_circle(p + Vector2(12, -9), 22, leaf.lightened(0.08))
		draw_circle(p + Vector2(0, -25), 21, leaf.darkened(0.08))
	elif resource.kind == "pierre":
		draw_ellipse_shadow(p, Vector2(26, 11))
		var rock: Color = Color("8d887a") if not exhausted else Color("594e49")
		draw_colored_polygon(PackedVector2Array([p + Vector2(-27, 14), p + Vector2(-19, -13), p + Vector2(3, -25), p + Vector2(28, -4), p + Vector2(22, 17)]), rock)
	else:
		for offset in [Vector2(-15, 10), Vector2(0, -5), Vector2(16, 8)]:
			draw_line(p + offset, p + offset + Vector2(0, -28), Color("45673c"), 4)
			draw_circle(p + offset + Vector2(0, -31), 7, Color("c7a83f") if not exhausted else Color("6a5942"))

func draw_structure(structure: Dictionary, camera: Vector2) -> void:
	var p := world_center(structure, camera)
	var active: bool = structure.active
	var wood := Color("8d6238") if active else Color("5a4a42")
	match structure.kind:
		"MARKER":
			draw_line(p + Vector2(0, 28), p + Vector2(0, -27), wood, 9)
			draw_colored_polygon(PackedVector2Array([p + Vector2(0, -30), p + Vector2(31, -18), p + Vector2(0, -7)]), Color("d2b64e"))
		"HEARTH":
			for angle in range(0, 360, 45):
				var v := Vector2.from_angle(deg_to_rad(angle)) * 23
				draw_circle(p + v, 8, Color("777169"))
			draw_circle(p, 18, Color("d96737") if active else Color("3f3b38"))
			draw_circle(p + Vector2(4, -7), 9, Color("f3c04f") if active else Color("55504b"))
		"WORKSHOP":
			draw_rect(Rect2(p - Vector2(35, 25), Vector2(70, 52)), wood)
			draw_colored_polygon(PackedVector2Array([p + Vector2(-42, -20), p + Vector2(0, -48), p + Vector2(42, -20)]), Color("46392f"))
			draw_circle(p + Vector2(18, 3), 13, Color("c7b986"), false, 5)
		"BRIDGE":
			draw_rect(Rect2(p - Vector2(48, 25), Vector2(96, 50)), wood)
			for x in range(-40, 41, 16):
				draw_line(p + Vector2(x, -24), p + Vector2(x, 24), Color("b2814c"), 3)
		"RECOVERY":
			draw_circle(p, 35, Color(0.22, 0.43, 0.23, 0.75))
			for angle in range(0, 360, 60):
				draw_circle(p + Vector2.from_angle(deg_to_rad(angle)) * 23, 6, Color("e1cb62"))

func draw_resident(resident: Dictionary, camera: Vector2) -> void:
	var p := world_center(resident, camera)
	var bob := sin(Time.get_ticks_msec() / 310.0 + float(resident.x)) * 2.0
	p.y += bob
	draw_ellipse_shadow(p + Vector2(0, 22), Vector2(18, 8))
	var coat: Color = Color("b36550") if resident.displaced else Color("567d68")
	draw_circle(p + Vector2(0, 2), 19, coat)
	draw_circle(p + Vector2(0, -21), 13, Color("d9b98e"))
	if visual_player.distance_to(Vector2(float(resident.x), float(resident.y))) <= 2.2:
		draw_label(resident.name, p + Vector2(0, -49))

func draw_player(camera: Vector2) -> void:
	var p := camera + (visual_player + Vector2(0.5, 0.5)) * TILE
	var stride := sin(move_progress * PI) * 5.0 if move_progress < 1.0 else sin(Time.get_ticks_msec() / 430.0) * 1.5
	p.y -= stride
	draw_ellipse_shadow(p + Vector2(0, 25 + stride), Vector2(22, 9))
	draw_circle(p + Vector2(0, 1), 23, Color("e1d7bc"))
	draw_circle(p + Vector2(0, -25), 15, Color("d3ae7f"))
	draw_line(p + Vector2(-7, 4), p + facing * 31, Color("d9b34a"), 6)
	if selected_build >= 0:
		var ghost := p + facing * TILE
		draw_circle(ghost, 34, Color(0.9, 0.75, 0.28, 0.2))
		draw_circle(ghost, 34, Color(0.92, 0.76, 0.26, 0.8), false, 3)

func draw_ellipse_shadow(center: Vector2, radius: Vector2) -> void:
	draw_set_transform(center, 0.0, Vector2(1.0, radius.y / radius.x))
	draw_circle(Vector2.ZERO, radius.x, Color(0.01, 0.02, 0.01, 0.42))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func draw_label(text: String, p: Vector2) -> void:
	var width := ThemeDB.fallback_font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, 14).x + 18
	draw_rect(Rect2(p - Vector2(width / 2, 19), Vector2(width, 25)), Color(0.03, 0.05, 0.04, 0.88))
	draw_string(ThemeDB.fallback_font, p, text, HORIZONTAL_ALIGNMENT_CENTER, width, 14, Color("f0e7cf"))

func draw_light_and_weather() -> void:
	var phase := fmod(float(state.tick), 240.0) / 240.0
	var night := clampf(abs(phase - 0.5) * 2.0 - 0.45, 0.0, 0.55)
	if night > 0.0:
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.02, 0.05, 0.11, night))
	for index in range(18):
		var x := fmod(index * 173.0 + Time.get_ticks_msec() * 0.018, size.x + 120.0) - 60.0
		var y := fmod(index * 97.0 + Time.get_ticks_msec() * 0.011, size.y)
		draw_line(Vector2(x, y), Vector2(x - 8, y + 18), Color(0.75, 0.84, 0.79, 0.13), 1)

func draw_context(camera: Vector2) -> void:
	var context := nearby_context()
	if selected_build >= 0:
		context = "E  Poser %s  ·  %s  ·  Échap annuler" % [BUILD_NAMES[selected_build].to_lower(), BUILD_COSTS[selected_build]]
	if context == "":
		return
	var width := ThemeDB.fallback_font.get_string_size(context, HORIZONTAL_ALIGNMENT_CENTER, -1, 17).x + 44
	var rect := Rect2(size.x / 2.0 - width / 2.0, 34, width, 42)
	draw_rect(rect, Color(0.03, 0.05, 0.04, 0.9))
	draw_rect(rect, Color("d8b64b"), false, 2)
	draw_string(ThemeDB.fallback_font, rect.position + Vector2(22, 27), context, HORIZONTAL_ALIGNMENT_CENTER, width - 44, 17, Color("f0e7cf"))

func nearby_context() -> String:
	for resident in state.residents:
		if visual_player.distance_to(Vector2(float(resident.x), float(resident.y))) <= 1.2:
			return "E  Parler ou aider %s" % resident.name
	for resource in state.resources:
		if visual_player.distance_to(Vector2(float(resource.x), float(resource.y))) <= 1.2 and resource.state == "active":
			return "E  Prélever %s" % resource.kind
	for structure in state.structures:
		if visual_player.distance_to(Vector2(float(structure.x), float(structure.y))) <= 1.2:
			return "E  Utiliser ou entretenir"
	return ""

func draw_hud() -> void:
	var inv: Dictionary = state.inventory
	var resource_text := "bois %d     pierre %d     fibres %d" % [inv.wood, inv.stone, inv.fiber]
	draw_rect(Rect2(22, 20, 296, 42), Color(0.03, 0.05, 0.04, 0.84))
	draw_string(ThemeDB.fallback_font, Vector2(41, 47), resource_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color("f0e7cf"))
	var first_x := size.x / 2.0 - 285.0
	for index in BUILDINGS.size():
		var rect := Rect2(first_x + index * 114.0, size.y - 82.0, 106, 64)
		var selected := selected_build == index
		draw_rect(rect, Color(0.09, 0.12, 0.09, 0.94))
		draw_rect(rect, Color("e0ba45") if selected else Color("617061"), false, 3 if selected else 1)
		draw_string(ThemeDB.fallback_font, rect.position + Vector2(10, 23), "%d · %s" % [index + 1, BUILD_NAMES[index]], HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("f0e7cf"))
		draw_string(ThemeDB.fallback_font, rect.position + Vector2(10, 46), BUILD_COSTS[index], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color("9fad99"))
	if toast_time > 0.0 and toast != "":
		var color := Color("e47c64") if toast_kind in ["blocked", "refused"] else Color("eee2c5")
		var alpha := minf(1.0, toast_time * 1.5)
		color.a = alpha
		var box := Rect2(24, size.y - 128, 430, 54)
		draw_rect(box, Color(0.03, 0.05, 0.04, 0.86 * alpha))
		draw_string(ThemeDB.fallback_font, box.position + Vector2(18, 33), toast, HORIZONTAL_ALIGNMENT_LEFT, 396, 15, color)
	if state.assembly:
		draw_string(ThemeDB.fallback_font, Vector2(size.x - 230, 42), "Des voix se réunissent au foyer", HORIZONTAL_ALIGNMENT_RIGHT, 205, 14, Color("e0ba45"))
	draw_string(ThemeDB.fallback_font, Vector2(size.x - 266, size.y - 28), "WASD / ZQSD · E agir · 1–5 construire", HORIZONTAL_ALIGNMENT_RIGHT, 240, 12, Color("c1cbbd"))

func draw_centered_text(text: String, p: Vector2, font_size: int, color: Color) -> void:
	draw_string(ThemeDB.fallback_font, p, text, HORIZONTAL_ALIGNMENT_CENTER, 600, font_size, color)
