extends Node3D

const Models = preload("res://models.gd")
const Landscape = preload("res://landscape.gd")
const Backend = preload("res://backend.gd")
const KINDS := ["MARKER", "HEARTH", "WORKSHOP", "BRIDGE", "SHELTER", "FENCE", "STORE", "RECOVERY"]
const NAMES := ["Balise", "Foyer", "Atelier", "Pont", "Abri", "Clôture", "Réserve", "Jardin"]
const COSTS := [[1, 1, 0], [1, 0, 1], [2, 1, 0], [2, 1, 0], [3, 0, 2], [1, 0, 0], [2, 0, 0], [1, 0, 2]]
const USEFUL := ["Retrouver ce lieu", "Se réunir, reprendre des forces", "Prélever davantage, épuiser plus vite", "Traverser l’eau", "S’abriter et se reposer", "Fermer un passage", "Partager des matières", "Faire reprendre les sites abîmés"]

var backend: Node
var state: Dictionary = {}
var player: CharacterBody3D
var person: Node3D
var camera: Camera3D
var sun: DirectionalLight3D
var env: WorldEnvironment
var clock := 0.0
var tick_timer := 0.0
var last_cell := Vector2i(4, 5)
var facing := Vector3.RIGHT
var camera_yaw := -0.65
var camera_pitch := 0.30
var camera_distance := 9.8
var resource_nodes: Dictionary = {}
var structure_nodes: Dictionary = {}
var resident_nodes: Dictionary = {}
var path_nodes: Dictionary = {}
var hud: CanvasLayer
var inventory_label: Label
var prompt: Label
var message: Label
var status_label: Label
var hotbar: HBoxContainer
var recipe_label: Label
var menu: Control
var menu_title: Label
var menu_subtitle: Label
var selected := -1
var ghost: Node3D
var ghost_cell := Vector2i.ZERO
var target: Dictionary = {}
var paused := true
var started := false
var world_file := ""
var core_file := ""
var world_picker: OptionButton
var toast_until := 0.0
var action_time := 0.0
var debug_mode := false
var needs_initial_position := true
var terrain: Node3D
var hud_controls: Control

func _ready() -> void:
	get_tree().auto_accept_quit = false
	_setup_inputs()
	_setup_environment()
	terrain = Node3D.new()
	add_child(terrain)
	Landscape.create(terrain)
	_setup_player()
	_setup_hud()
	backend = Backend.new()
	add_child(backend)
	backend.updated.connect(_on_state)
	backend.failed.connect(_on_failure)
	var args := OS.get_cmdline_user_args()
	var saves := ProjectSettings.globalize_path("user://worlds")
	for i in range(args.size() - 1):
		if args[i] == "--saves":
			saves = args[i + 1]
	DirAccess.make_dir_recursive_absolute(saves)
	var preferences := ConfigFile.new()
	preferences.load(saves.path_join("active.cfg"))
	var last_world: String = preferences.get_value("world", "file", "vallee-3d.save")
	world_file = saves.path_join(last_world.get_file())
	core_file = ProjectSettings.globalize_path("res://../dist/CORPUS-Monde-vivant")
	for i in range(args.size() - 1):
		if args[i] == "--core": core_file = args[i + 1]
	_refresh_world_picker()
	backend.start(core_file, world_file)
	if "--autoplay" in args:
		paused = false
		menu.hide()

func _setup_inputs() -> void:
	var keys := {"forward": [KEY_W, KEY_Z, KEY_UP], "back": [KEY_S, KEY_DOWN], "left": [KEY_A, KEY_Q, KEY_LEFT], "right": [KEY_D, KEY_RIGHT], "run": [KEY_SHIFT], "jump": [KEY_SPACE]}
	for action in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key in keys[action]:
			var event := InputEventKey.new()
			event.physical_keycode = key
			InputMap.action_add_event(action, event)

func _setup_environment() -> void:
	env = WorldEnvironment.new()
	env.environment = Environment.new()
	var e: Environment = env.environment
	e.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("6c9dad")
	sky_mat.sky_horizon_color = Color("c8d5c6")
	sky_mat.ground_bottom_color = Color("677765")
	sky_mat.ground_horizon_color = Color("c8d5c6")
	sky.sky_material = sky_mat
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("c5d5ca")
	e.ambient_light_energy = 0.28
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	e.fog_enabled = true
	e.fog_light_color = Color("b7ccc0")
	e.fog_density = 0.0028
	add_child(env)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-44, -35, 0)
	sun.light_color = Color("fff0c9")
	sun.light_energy = 0.82
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 100
	add_child(sun)

func _setup_player() -> void:
	player = CharacterBody3D.new()
	player.name = "Player"
	player.floor_snap_length = 0.6
	player.floor_max_angle = deg_to_rad(48)
	var collider := CollisionShape3D.new()
	var shape := CapsuleShape3D.new()
	shape.radius = 0.32
	shape.height = 1.75
	collider.shape = shape
	collider.position.y = 0.9
	player.add_child(collider)
	add_child(player)
	player.position = Landscape.point(Vector2i(4, 5)) + Vector3.UP * 0.1
	person = Models.person(player, Color("cfad70"), true)
	camera = Camera3D.new()
	camera.current = true
	camera.fov = 66
	camera.far = 260
	add_child(camera)
	_update_camera(1.0)

func _physics_process(delta: float) -> void:
	if not started:
		return
	clock += delta
	_update_camera(delta)
	_update_residents(delta)
	_update_target()
	if paused:
		return
	var axis := Input.get_vector("left", "right", "forward", "back")
	var direction := camera.global_basis.x * axis.x + camera.global_basis.z * axis.y
	direction.y = 0
	direction = direction.normalized()
	var speed := 5.2 if Input.is_action_pressed("run") else 3.25
	var pcell := _cell_of(player.position)
	if path_nodes.has(pcell):
		speed *= 1.18
	if direction.length_squared() > 0.1:
		facing = direction
		person.rotation.y = lerp_angle(person.rotation.y, atan2(-direction.x, -direction.z), delta * 14)
	player.velocity.x = move_toward(player.velocity.x, direction.x * speed, delta * 24)
	player.velocity.z = move_toward(player.velocity.z, direction.z * speed, delta * 24)
	if not player.is_on_floor():
		player.velocity.y -= delta * 20
	elif Input.is_action_just_pressed("jump"):
		player.velocity.y = 6
	var previous := player.position
	player.move_and_slide()
	var next_cell := _cell_of(player.position)
	if not _passable(next_cell):
		# Sweep is short (< 9 cm per physics frame); never jump across a closed cell.
		player.position.x = previous.x
		player.position.z = previous.z
		player.velocity.x = 0
		player.velocity.z = 0
		next_cell = _cell_of(player.position)
	if next_cell != last_cell:
		var difference := next_cell - last_cell
		if absi(difference.x) + absi(difference.y) == 2:
			var middle := Vector2i(next_cell.x, last_cell.y)
			if not _passable(middle): middle = Vector2i(last_cell.x, next_cell.y)
			if _passable(middle): backend.request("EXPLORE %d %d" % [middle.x, middle.y])
		last_cell = next_cell
		backend.request("EXPLORE %d %d" % [next_cell.x, next_cell.y])
	if player.position.y < -5:
		player.position = Landscape.point(last_cell) + Vector3.UP
	var moving := Vector2(player.velocity.x, player.velocity.z).length() / 5.0
	action_time = maxf(0, action_time - delta * 2.5)
	Models.animate_person(person, clock, minf(1, moving), action_time)
	tick_timer += delta
	if tick_timer > 1.2:
		tick_timer = 0.0
		backend.request("WAIT_1")
	_update_daylight()
	if clock > toast_until:
		message.text = ""

func _update_camera(delta: float) -> void:
	var aim := player.position + Vector3.UP * 1.25
	var offset := Vector3(sin(camera_yaw) * cos(camera_pitch), sin(camera_pitch), cos(camera_yaw) * cos(camera_pitch)) * camera_distance
	var destination := aim + offset
	if is_inside_tree():
		var ray := PhysicsRayQueryParameters3D.create(aim, destination)
		ray.exclude = [player.get_rid()]
		var hit := get_world_3d().direct_space_state.intersect_ray(ray)
		if not hit.is_empty():
			destination = hit.position + (aim - hit.position).normalized() * 0.3
	camera.position = camera.position.lerp(destination, minf(1, delta * 12))
	camera.look_at(aim)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			if selected >= 0:
				_select(-1)
			else:
				_toggle_pause()
			return
		if event.keycode == KEY_F3:
			debug_mode = not debug_mode
		if paused:
			return
		var number_key: int = event.physical_keycode if event.physical_keycode != 0 else event.keycode
		if number_key >= KEY_1 and number_key <= KEY_8:
			_select(number_key - KEY_1)
		elif event.keycode == KEY_E:
			_interact()
		elif event.keycode == KEY_X:
			if target.get("type", "") == "structure":
				backend.request("DISMANTLE %d %d" % [target.x, target.y])
		elif event.keycode == KEY_R:
			if target.get("type", "") == "structure":
				backend.request("DEPOSIT %d %d" % [target.x, target.y])
	if paused:
		return
	if event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		camera_yaw -= event.relative.x * 0.005
		camera_pitch = clampf(camera_pitch + event.relative.y * 0.003, 0.12, 1.15)
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			camera_distance = maxf(3.0, camera_distance - 0.7)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			camera_distance = minf(17.0, camera_distance + 0.7)
		elif event.button_index == MOUSE_BUTTON_LEFT and selected >= 0:
			_interact()

func _passable(cell: Vector2i) -> bool:
	if cell.x <= 0 or cell.x >= 17 or cell.y <= 0 or cell.y >= 11:
		return false
	var on_water := (cell.x >= 2 and cell.x <= 4 and cell.y >= 2 and cell.y <= 3) or (cell.x >= 15 and cell.y >= 7 and cell.y <= 9)
	var bridged := false
	for s in state.get("structures", []):
		if Vector2i(int(s.x), int(s.y)) == cell:
			if s.kind == "BRIDGE" and s.active:
				bridged = true
			if s.kind in ["FENCE", "STORE", "WORKSHOP"]:
				return false
	return not on_water or bridged

func _cell_of(pos: Vector3) -> Vector2i:
	return Vector2i(floori(pos.x / 4), floori(pos.z / 4))

func _on_state(next: Dictionary, command: String) -> void:
	state = next
	if needs_initial_position:
		last_cell = Vector2i(int(state.player.x), int(state.player.y))
		player.position = Landscape.point(last_cell) + Vector3.UP * 0.12
		_load_view()
		needs_initial_position = false
		started = true
		_update_camera(1)
	_sync_resources()
	_sync_structures()
	_sync_residents()
	_sync_paths()
	var inv: Dictionary = state.inventory
	inventory_label.text = "Bois  %d     Pierre  %d     Fibres  %d" % [inv.wood, inv.stone, inv.fiber]
	status_label.text = "Sauvegardé" if not debug_mode else "%.0f FPS · cycle %d · Rust %d ms" % [Engine.get_frames_per_second(), state.tick, backend.last_latency_ms]
	var outcome = state.get("outcome")
	if outcome is Dictionary and command != "STATE" and not command.begins_with("WAIT_") and not command.begins_with("EXPLORE"):
		_toast(str(outcome.message))
		action_time = 1.0
		if outcome.kind == "changed" and command.begins_with("PLACE"):
			_select(-1)
	if command.begins_with("EXPLORE") and outcome is Dictionary and outcome.kind == "blocked":
		last_cell = Vector2i(int(state.player.x), int(state.player.y))
		player.position = Landscape.point(last_cell) + Vector3.UP * 0.1
	_save_view()

func _sync_resources() -> void:
	for data in state.resources:
		var cell := Vector2i(int(data.x), int(data.y))
		var key := str(cell)
		if resource_nodes.has(key) and resource_nodes[key].get_meta("state") == data.state:
			continue
		if resource_nodes.has(key):
			resource_nodes[key].queue_free()
		var root: Node3D = Models.resource(self, data, Landscape.point(cell))
		root.set_meta("state", data.state)
		resource_nodes[key] = root

func _sync_structures() -> void:
	var existing := {}
	for data in state.structures:
		var cell := Vector2i(int(data.x), int(data.y))
		var key := str(cell)
		existing[key] = true
		var signature := "%s:%s" % [data.kind, data.active]
		if structure_nodes.has(key) and structure_nodes[key].get_meta("state") == signature:
			continue
		if structure_nodes.has(key):
			structure_nodes[key].queue_free()
		var at := Landscape.point(cell)
		if data.kind == "BRIDGE": at.y = 0.03
		var root: Node3D = Models.structure(self, data.kind, at, data.active)
		root.set_meta("state", signature)
		structure_nodes[key] = root
	for key in structure_nodes.keys():
		if not existing.has(key):
			structure_nodes[key].queue_free()
			structure_nodes.erase(key)

func _sync_residents() -> void:
	for data in state.residents:
		var at := Landscape.point(Vector2i(int(data.x), int(data.y)))
		if not resident_nodes.has(data.name):
			var shades := {"Ina": Color("c68161"), "Mara": Color("699b99"), "Nilo": Color("beaa64")}
			var root: Node3D = Models.person(self, shades.get(data.name, Color("899c74")))
			root.position = at
			var label := Label3D.new()
			label.text = data.name
			label.position.y = 2.25
			label.font_size = 32
			label.pixel_size = 0.008
			label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			label.modulate = Color("fff6df")
			label.name = "name"
			root.add_child(label)
			resident_nodes[data.name] = root
		resident_nodes[data.name].set_meta("destination", at)

func _update_residents(delta: float) -> void:
	for root: Node3D in resident_nodes.values():
		var at: Vector3 = root.get_meta("destination", root.position)
		var delta_pos := at - root.position
		var distance := delta_pos.length()
		if distance > 0.05:
			root.position = root.position.move_toward(at, delta * 1.65)
			root.rotation.y = lerp_angle(root.rotation.y, atan2(-delta_pos.x, -delta_pos.z), delta * 7)
		Models.animate_person(root, clock, 0.7 if distance > 0.05 else 0.0)
		root.get_node("name").visible = root.position.distance_to(player.position) < 7

func _sync_paths() -> void:
	for cell in state.cells:
		if cell.path not in ["trail", "road"] or cell.terrain != "grass":
			continue
		var index := Vector2i(int(cell.x), int(cell.y))
		if path_nodes.has(index) and path_nodes[index].get_meta("state") == cell.path:
			continue
		if path_nodes.has(index): path_nodes[index].queue_free()
		var node: Node3D = Landscape.footpath(self, index, cell.path)
		node.set_meta("state", cell.path)
		path_nodes[index] = node

func _select(index: int) -> void:
	selected = index if selected != index else -1
	if is_instance_valid(ghost): ghost.queue_free()
	ghost = null
	if selected >= 0:
		ghost = Models.structure(self, KINDS[selected], Vector3.ZERO, true, true)
	for i in hotbar.get_child_count():
		var button: Button = hotbar.get_child(i)
		button.modulate = Color("ffe3a4") if i == selected else Color.WHITE
	recipe_label.visible = selected >= 0
	_update_target()

func _update_target() -> void:
	if state.is_empty(): return
	if selected >= 0:
		ghost_cell = _cell_of(player.position + facing * 4.3)
		if ghost_cell == _cell_of(player.position):
			ghost_cell += Vector2i(1 if facing.x > 0 else -1, 0) if absf(facing.x) > absf(facing.z) else Vector2i(0, 1 if facing.z > 0 else -1)
		if is_instance_valid(ghost):
			ghost.position = Landscape.point(ghost_cell)
			if KINDS[selected] == "BRIDGE": ghost.position.y = 0.03
		var c: Array = COSTS[selected]
		recipe_label.text = "%s · %s\n%d bois / %d pierre / %d fibres" % [NAMES[selected], USEFUL[selected], c[0], c[1], c[2]]
		prompt.text = "E / clic gauche : construire ici    ·    Échap : annuler"
		return
	target = {}
	var best := 5.0
	for type in ["resident", "resource", "structure"]:
		var entries: Array = state.residents if type == "resident" else (state.resources if type == "resource" else state.structures)
		for data in entries:
			var p := Landscape.point(Vector2i(int(data.x), int(data.y)))
			if type == "resident" and resident_nodes.has(data.name): p = resident_nodes[data.name].position
			var distance := Vector2(player.position.x - p.x, player.position.z - p.z).length()
			var cell_distance := _cell_of(player.position) - Vector2i(int(data.x), int(data.y))
			if distance < best and absi(cell_distance.x) + absi(cell_distance.y) <= 2:
				best = distance
				target = data.duplicate()
				target.type = type
	if target.is_empty():
		prompt.text = "Marche vers un arbre, une plante ou un habitant."
	elif target.type == "resident":
		prompt.text = "E · Parler à %s" % target.name
	elif target.type == "resource":
		prompt.text = "E · Ramasser %s" % target.kind if target.state == "active" else "Ce lieu se repose." if target.state == "recovering" else "Ce site est épuisé."
	else:
		var label: String = NAMES[KINDS.find(target.kind)]
		prompt.text = "E · %s    X · Démonter" % label
		if target.kind in ["STORE", "HEARTH"]:
			prompt.text = "E · Prendre    R · Déposer    X · Démonter"

func _interact() -> void:
	if selected >= 0:
		backend.request("PLACE %s %d %d" % [KINDS[selected], ghost_cell.x, ghost_cell.y])
	elif not target.is_empty():
		backend.request("USE %d %d" % [target.x, target.y])
		action_time = 1.0

func _update_daylight() -> void:
	var phase := float(state.get("tick", 0)) / 1000.0
	var energy := 0.82 + sin(phase) * 0.16
	sun.light_energy = energy
	sun.rotation_degrees.x = -42 + sin(phase) * 15

func _style(bg: Color, border := Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(8)
	s.set_content_margin_all(12)
	s.border_color = border
	s.set_border_width_all(1)
	return s

func _label(parent: Node, text: String, font_size: int, color := Color("eee8d8")) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	parent.add_child(label)
	return label

func _setup_hud() -> void:
	hud = CanvasLayer.new()
	add_child(hud)
	hud_controls = Control.new()
	hud.add_child(hud_controls)
	hud_controls.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud_controls.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top := PanelContainer.new()
	hud_controls.add_child(top)
	top.position = Vector2(26, 24)
	top.add_theme_stylebox_override("panel", _style(Color(0.06, 0.1, 0.09, 0.8)))
	var top_box := VBoxContainer.new()
	top.add_child(top_box)
	_label(top_box, "CORPUS   /   LA VALLÉE DES PASSAGES", 13, Color("dfc891"))
	inventory_label = _label(top_box, "Bois  0     Pierre  0     Fibres  0", 18)
	status_label = _label(hud_controls, "Ouverture…", 14)
	status_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	status_label.position += Vector2(-220, 30)
	var bottom := VBoxContainer.new()
	hud_controls.add_child(bottom)
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom.offset_top = -170
	bottom.offset_left = 24
	bottom.offset_right = -24
	bottom.offset_bottom = -16
	bottom.alignment = BoxContainer.ALIGNMENT_END
	message = _label(bottom, "", 19, Color("fff5d3"))
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message.add_theme_color_override("font_shadow_color", Color("13231c"))
	message.add_theme_constant_override("shadow_offset_x", 2)
	message.add_theme_constant_override("shadow_offset_y", 2)
	recipe_label = _label(bottom, "", 16)
	recipe_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	recipe_label.hide()
	prompt = _label(bottom, "", 17)
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt.add_theme_color_override("font_shadow_color", Color("172921"))
	prompt.add_theme_constant_override("shadow_offset_y", 2)
	hotbar = HBoxContainer.new()
	hotbar.alignment = BoxContainer.ALIGNMENT_CENTER
	hotbar.add_theme_constant_override("separation", 7)
	bottom.add_child(hotbar)
	for i in range(KINDS.size()):
		var b := Button.new()
		b.text = "%d  %s" % [i + 1, NAMES[i]]
		b.custom_minimum_size = Vector2(107, 49)
		b.focus_mode = Control.FOCUS_NONE
		b.add_theme_stylebox_override("normal", _style(Color(0.065, 0.1, 0.08, 0.87), Color("747e63")))
		b.add_theme_stylebox_override("hover", _style(Color("3c4d3b"), Color("d2ba81")))
		b.pressed.connect(func() -> void: _select(i))
		b.tooltip_text = USEFUL[i]
		hotbar.add_child(b)
	var controls := _label(bottom, "ZQSD / WASD · marcher    Maj · courir    Espace · sauter    Clic droit + souris · caméra    Molette · zoom    Échap · pause", 13)
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	controls.add_theme_color_override("font_shadow_color", Color("13231c"))
	controls.add_theme_constant_override("shadow_offset_y", 2)
	_make_menu()

func _make_menu() -> void:
	menu = ColorRect.new()
	menu.color = Color(0.025, 0.055, 0.042, 0.72)
	hud.add_child(menu)
	menu.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var center := CenterContainer.new()
	menu.add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(480, 350)
	box.add_theme_constant_override("separation", 20)
	center.add_child(box)
	menu_title = _label(box, "CORPUS", 56, Color("ead69e"))
	menu_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	menu_subtitle = _label(box, "La vallée des passages\n\nUne maison, un chemin, une rencontre.\nCe que tu fais ici restera après ton départ.", 20)
	menu_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var play := Button.new()
	play.text = "Entrer dans la vallée"
	play.custom_minimum_size.y = 56
	box.add_child(play)
	play.pressed.connect(func() -> void: paused = false; menu.hide())
	var new_world := Button.new()
	new_world.text = "Créer un autre monde"
	new_world.custom_minimum_size.y = 44
	box.add_child(new_world)
	new_world.pressed.connect(_new_world)
	world_picker = OptionButton.new()
	world_picker.custom_minimum_size.y = 42
	box.add_child(world_picker)
	world_picker.item_selected.connect(func(index: int) -> void:
		var path: String = world_picker.get_item_metadata(index)
		if path != world_file: _open_world(path)
	)
	var quit := Button.new()
	quit.text = "Sauvegarder et quitter"
	quit.custom_minimum_size.y = 44
	box.add_child(quit)
	quit.pressed.connect(_quit)

func _toggle_pause() -> void:
	paused = not paused
	menu.visible = paused
	menu_subtitle.text = "La vallée des passages\n\nLe monde est sauvegardé."

func _toast(text: String) -> void:
	message.text = text
	toast_until = clock + 4.5

func _on_failure(text: String) -> void:
	paused = true
	menu.show()
	menu_subtitle.text = text
	push_error(text)

func _new_world() -> void:
	# A new filename preserves every existing world.
	_open_world(world_file.get_base_dir().path_join("vallee-%d.save" % Time.get_unix_time_from_system()))

func _refresh_world_picker() -> void:
	world_picker.clear()
	var worlds: Array[String] = []
	for file in DirAccess.get_files_at(world_file.get_base_dir()):
		if file.ends_with(".save"): worlds.append(file)
	if not worlds.has(world_file.get_file()): worlds.append(world_file.get_file())
	worlds.sort()
	for file in worlds:
		world_picker.add_item("Monde · " + file.trim_suffix(".save"))
		var i := world_picker.item_count - 1
		world_picker.set_item_metadata(i, world_file.get_base_dir().path_join(file))
		if file == world_file.get_file(): world_picker.select(i)

func _open_world(path: String) -> void:
	paused = true
	await backend.finish()
	_save_view()
	world_file = path
	started = false
	state = {}
	_select(-1)
	needs_initial_position = true
	for collection in [resource_nodes, resident_nodes, structure_nodes, path_nodes]:
		for node: Node in collection.values(): node.queue_free()
		collection.clear()
	_refresh_world_picker()
	backend.start(core_file, world_file)
	var preferences := ConfigFile.new()
	preferences.set_value("world", "file", world_file.get_file())
	preferences.save(world_file.get_base_dir().path_join("active.cfg"))
	paused = false
	menu.hide()

func _save_view() -> void:
	if not started: return
	var config := ConfigFile.new()
	config.set_value("view", "position", player.position)
	config.set_value("view", "yaw", camera_yaw)
	config.set_value("view", "pitch", camera_pitch)
	config.set_value("view", "distance", camera_distance)
	config.save(world_file + ".view")

func _load_view() -> void:
	var config := ConfigFile.new()
	if config.load(world_file + ".view") == OK:
		var p: Vector3 = config.get_value("view", "position", player.position)
		if _cell_of(p) == last_cell:
			player.position = p
		camera_yaw = config.get_value("view", "yaw", camera_yaw)
		camera_pitch = config.get_value("view", "pitch", camera_pitch)
		camera_distance = config.get_value("view", "distance", camera_distance)

func _quit() -> void:
	paused = true
	await backend.finish()
	_save_view()
	get_tree().quit()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_quit()
