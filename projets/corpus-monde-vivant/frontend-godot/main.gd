extends Control

const TILE := 42.0
const MAP_ORIGIN := Vector2(30, 108)
const PANEL_X := 820.0
const FONT_SIZE := 16

const COLORS := {
	"background": Color("0b100e"),
	"panel": Color("121914"),
	"paper": Color("e7e0cb"),
	"muted": Color("97a092"),
	"gold": Color("e5b945"),
	"grass": Color("65785d"),
	"path": Color("a89979"),
	"water": Color("526f78"),
	"cliff": Color("252a27"),
	"unknown": Color("161b18"),
	"trail": Color("b4a66f"),
	"road": Color("d2bf82"),
	"danger": Color("cf6b55"),
	"resident": Color("d7c88c"),
}

var state: Dictionary = {}
var error_message := ""
var buttons: Array[Button] = []

func _ready() -> void:
	set_process_input(true)
	build_controls()
	call_deferred("grab_focus")
	request_state("")

func build_controls() -> void:
	add_command_button("↑", Rect2(PANEL_X + 54, 548, 54, 42), "UP")
	add_command_button("←", Rect2(PANEL_X, 594, 54, 42), "LEFT")
	add_command_button("↓", Rect2(PANEL_X + 54, 594, 54, 42), "DOWN")
	add_command_button("→", Rect2(PANEL_X + 108, 594, 54, 42), "RIGHT")
	add_command_button("E · Agir", Rect2(PANEL_X + 180, 548, 150, 42), "INTERACT")
	add_command_button("Attendre", Rect2(PANEL_X + 180, 594, 150, 42), "WAIT_12")
	add_command_button("Balise", Rect2(PANEL_X, 674, 96, 38), "BUILD_MARKER")
	add_command_button("Foyer", Rect2(PANEL_X + 102, 674, 96, 38), "BUILD_HEARTH")
	add_command_button("Atelier", Rect2(PANEL_X + 204, 674, 96, 38), "BUILD_WORKSHOP")
	add_command_button("Pont", Rect2(PANEL_X, 716, 96, 38), "BUILD_BRIDGE")
	add_command_button("Reprise", Rect2(PANEL_X + 102, 716, 96, 38), "BUILD_RECOVERY")
	add_command_button("Retour", Rect2(PANEL_X + 204, 716, 96, 38), "RETURN")

func add_command_button(label: String, rect: Rect2, command: String) -> void:
	var button := Button.new()
	button.text = label
	button.position = rect.position
	button.size = rect.size
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 14)
	button.pressed.connect(func() -> void: request_state(command))
	add_child(button)
	buttons.append(button)

func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	var command := ""
	match event.physical_keycode:
		KEY_UP, KEY_W, KEY_Z:
			command = "UP"
		KEY_RIGHT, KEY_D:
			command = "RIGHT"
		KEY_DOWN, KEY_S:
			command = "DOWN"
		KEY_LEFT, KEY_A, KEY_Q:
			command = "LEFT"
		KEY_E, KEY_SPACE:
			command = "INTERACT"
		KEY_1:
			command = "BUILD_MARKER"
		KEY_2:
			command = "BUILD_HEARTH"
		KEY_3:
			command = "BUILD_WORKSHOP"
		KEY_4:
			command = "BUILD_BRIDGE"
		KEY_5:
			command = "BUILD_RECOVERY"
	if not command.is_empty():
		get_viewport().set_input_as_handled()
		request_state(command)

func request_state(command: String) -> void:
	var core_path := ProjectSettings.globalize_path("res://../dist/CORPUS-Monde-vivant")
	var save_dir := ProjectSettings.globalize_path("user://corpus-monde-vivant")
	DirAccess.make_dir_recursive_absolute(save_dir)
	var save_path := save_dir.path_join("monde-principal.save")
	if not FileAccess.file_exists(core_path):
		error_message = "Noyau Rust absent. Lance d’abord package.sh."
		queue_redraw()
		return
	var arguments := PackedStringArray(["--machine", "--save", save_path])
	if not command.is_empty():
		arguments.append_array(PackedStringArray(["--command", command]))
	var output: Array = []
	var exit_code := OS.execute(core_path, arguments, output, true, false)
	var payload := "".join(output).strip_edges()
	var parsed = JSON.parse_string(payload)
	if exit_code != 0 or not parsed is Dictionary or not parsed.get("ok", false):
		error_message = "Le noyau ne répond pas : " + payload.left(220)
	else:
		state = parsed
		error_message = ""
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), COLORS.background)
	draw_header()
	if not error_message.is_empty():
		draw_text_block(error_message, Vector2(34, 150), 720, COLORS.danger, 20)
		return
	if state.is_empty():
		draw_text_block("Ouverture du monde…", Vector2(34, 150), 720, COLORS.paper, 20)
		return
	draw_world()
	draw_panel()

func draw_header() -> void:
	draw_string(ThemeDB.fallback_font, Vector2(30, 48), "CORPUS", HORIZONTAL_ALIGNMENT_LEFT, -1, 28, COLORS.gold)
	draw_string(ThemeDB.fallback_font, Vector2(172, 48), "Ce que tu rends possible", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, COLORS.paper)
	draw_string(ThemeDB.fallback_font, Vector2(30, 78), "LE MONDE N’ATTEND PAS LE JOUEUR", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLORS.muted)
	draw_line(Vector2(30, 88), Vector2(size.x - 30, 88), Color("334038"), 1)

func draw_world() -> void:
	for cell in state.get("cells", []):
		draw_cell(cell)
	for resource in state.get("resources", []):
		draw_resource(resource)
	for structure in state.get("structures", []):
		draw_structure(structure)
	for resident in state.get("residents", []):
		draw_resident(resident)
	draw_player(state.player)
	draw_rect(Rect2(MAP_ORIGIN - Vector2(3, 3), Vector2(float(state.width) * TILE + 6, float(state.height) * TILE + 6)), Color("020302"), false, 3)

func draw_cell(cell: Dictionary) -> void:
	var point := MAP_ORIGIN + Vector2(float(cell.x), float(cell.y)) * TILE
	var rect := Rect2(point, Vector2(TILE, TILE))
	if not cell.visible:
		draw_rect(rect, COLORS.unknown)
		draw_line(point, point + Vector2(TILE, TILE), Color("202723"), 1)
		return
	var color: Color = COLORS.get(cell.terrain, COLORS.grass)
	draw_rect(rect, color)
	if cell.terrain == "water":
		draw_line(point + Vector2(5, 14), point + Vector2(TILE - 5, 14), Color("78939a"), 2)
		draw_line(point + Vector2(10, 27), point + Vector2(TILE - 3, 27), Color("78939a"), 2)
	elif cell.path == "trail":
		draw_line(point + Vector2(0, TILE / 2), point + Vector2(TILE, TILE / 2), COLORS.trail, 5)
	elif cell.path == "road":
		draw_line(point + Vector2(0, TILE / 2), point + Vector2(TILE, TILE / 2), COLORS.road, 10)
	draw_rect(rect, Color(0.05, 0.06, 0.05, 0.35), false, 1)

func cell_center(data: Dictionary) -> Vector2:
	return MAP_ORIGIN + (Vector2(float(data.x), float(data.y)) + Vector2(0.5, 0.5)) * TILE

func draw_resource(resource: Dictionary) -> void:
	var center := cell_center(resource)
	var color := Color("7b9a68")
	if resource.kind == "pierre":
		color = Color("bab8ac")
	elif resource.kind == "fibres":
		color = Color("dfc757")
	if resource.state == "exhausted":
		color = COLORS.danger
	draw_circle(center, 10, color)
	draw_circle(center, 10, Color("131713"), false, 2)
	draw_string(ThemeDB.fallback_font, center + Vector2(-4, 5), resource.kind.left(1), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("121510"))

func draw_structure(structure: Dictionary) -> void:
	var center := cell_center(structure)
	var color: Color = COLORS.gold if structure.active else COLORS.danger
	draw_rect(Rect2(center - Vector2(13, 13), Vector2(26, 26)), color)
	draw_rect(Rect2(center - Vector2(13, 13), Vector2(26, 26)), Color("171b18"), false, 2)
	var glyphs := {"MARKER": "B", "HEARTH": "F", "WORKSHOP": "A", "BRIDGE": "=", "RECOVERY": "R"}
	draw_string(ThemeDB.fallback_font, center + Vector2(-5, 6), glyphs.get(structure.kind, "?"), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("11130f"))

func draw_resident(resident: Dictionary) -> void:
	var center := cell_center(resident)
	var color: Color = COLORS.danger if resident.displaced else COLORS.resident
	draw_circle(center, 13, color)
	draw_circle(center, 13, Color("111411"), false, 3)
	draw_string(ThemeDB.fallback_font, center + Vector2(-5, 6), resident.name.left(1), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color("111411"))

func draw_player(player: Dictionary) -> void:
	var center := cell_center(player)
	draw_colored_polygon(PackedVector2Array([
		center + Vector2(0, -16), center + Vector2(14, 0),
		center + Vector2(0, 16), center + Vector2(-14, 0)
	]), COLORS.paper)
	draw_polyline(PackedVector2Array([
		center + Vector2(0, -16), center + Vector2(14, 0),
		center + Vector2(0, 16), center + Vector2(-14, 0),
		center + Vector2(0, -16)
	]), Color("131713"), 3)

func draw_panel() -> void:
	draw_rect(Rect2(PANEL_X - 18, 108, 350, 420), COLORS.panel)
	draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 138), "MONDE ACTUEL", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLORS.gold)
	draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 170), "Cycle %d" % int(state.tick), HORIZONTAL_ALIGNMENT_LEFT, -1, 26, COLORS.paper)
	var inventory: Dictionary = state.inventory
	draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 205), "bois %d   pierre %d   fibres %d" % [inventory.wood, inventory.stone, inventory.fiber], HORIZONTAL_ALIGNMENT_LEFT, -1, 15, COLORS.paper)
	var commons: Dictionary = state.commons
	draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 230), "dépôt commun %d / %d / %d" % [commons.wood, commons.stone, commons.fiber], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, COLORS.muted)
	if state.assembly:
		draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 260), "ASSEMBLÉE CAPABLE D’AGIR", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, COLORS.gold)
	var outcome = state.get("outcome")
	var outcome_y := 292.0
	if outcome is Dictionary:
		var outcome_color: Color = COLORS.danger if outcome.kind in ["blocked", "refused"] else COLORS.paper
		draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, outcome_y), outcome_label(outcome.kind), HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLORS.gold)
		draw_text_block(outcome.message, Vector2(PANEL_X, outcome_y + 28), 310, outcome_color, 16)
	var trace = state.get("last_trace")
	if trace is Dictionary:
		draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 414), "TRACE CONSERVÉE · t%d" % int(trace.tick), HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLORS.muted)
		draw_text_block(trace.title, Vector2(PANEL_X, 442), 310, COLORS.paper, 17)
		draw_text_block(trace.detail, Vector2(PANEL_X, 474), 310, COLORS.muted, 13)
	draw_string(ThemeDB.fallback_font, Vector2(PANEL_X, 658), "CONSTRUIRE — touches 1 à 5", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLORS.muted)
	draw_string(ThemeDB.fallback_font, Vector2(30, 735), "WASD / ZQSD · E agir · les chemins, coûts, absences et refus persistent", HORIZONTAL_ALIGNMENT_LEFT, -1, 12, COLORS.muted)

func outcome_label(kind: String) -> String:
	match kind:
		"changed": return "LE MONDE RÉPOND"
		"blocked": return "LE PASSAGE RÉSISTE"
		"refused": return "REFUS EFFECTIF"
		_: return "OBSERVATION"

func draw_text_block(text: String, origin: Vector2, width: float, color: Color, font_size: int) -> void:
	var words := text.split(" ")
	var line := ""
	var y := origin.y
	for word in words:
		var candidate := word if line.is_empty() else line + " " + word
		if ThemeDB.fallback_font.get_string_size(candidate, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x > width and not line.is_empty():
			draw_string(ThemeDB.fallback_font, Vector2(origin.x, y), line, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, color)
			y += font_size + 5
			line = word
		else:
			line = candidate
	if not line.is_empty():
		draw_string(ThemeDB.fallback_font, Vector2(origin.x, y), line, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, color)
