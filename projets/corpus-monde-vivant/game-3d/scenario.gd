extends SceneTree

# Reproducible development scenario using ordinary core commands, no inventory injection.
var game: Node3D
var failed := false

func _initialize() -> void:
	call_deferred("run")

func send(text: String) -> void:
	game.backend.request(text)
	await game.backend.updated

func walk_to(goal: Vector2i) -> void:
	var start := Vector2i(int(game.state.player.x), int(game.state.player.y))
	var queue: Array[Vector2i] = [start]
	var previous := {start: start}
	while not queue.is_empty():
		var current: Vector2i = queue.pop_front()
		if current == goal: break
		for offset in [Vector2i.LEFT, Vector2i.RIGHT, Vector2i.UP, Vector2i.DOWN]:
			var next: Vector2i = current + offset
			if game._passable(next) and not previous.has(next):
				previous[next] = current
				queue.append(next)
	if not previous.has(goal):
		failed = true
		return
	var route: Array[Vector2i] = []
	var cursor := goal
	while cursor != start:
		route.push_front(cursor)
		cursor = previous[cursor]
	for cell in route:
		await send("EXPLORE %d %d" % [cell.x, cell.y])
	game.last_cell = goal
	game.player.position = game.Landscape.point(goal) + Vector3.UP * 0.1

func collect(at: Vector2i, from: Vector2i) -> void:
	await walk_to(from)
	await send("USE %d %d" % [at.x, at.y])

func run() -> void:
	game = load("res://main.tscn").instantiate()
	root.add_child(game)
	await create_timer(1.0).timeout
	game.paused = true
	if not game.started:
		quit(1)
		return
	await collect(Vector2i(5, 5), Vector2i(4, 5))
	await collect(Vector2i(6, 7), Vector2i(5, 7))
	await collect(Vector2i(11, 8), Vector2i(10, 8))
	await collect(Vector2i(4, 8), Vector2i(4, 7))
	await collect(Vector2i(6, 2), Vector2i(6, 3))
	await walk_to(Vector2i(5, 5))
	await send("PLACE SHELTER 6 5")
	await send("WAIT_45")
	await collect(Vector2i(5, 5), Vector2i(4, 5))
	await collect(Vector2i(6, 7), Vector2i(5, 7))
	await collect(Vector2i(4, 8), Vector2i(4, 7))
	await collect(Vector2i(8, 5), Vector2i(7, 5))
	await send("PLACE HEARTH 7 6")
	await send("PLACE MARKER 7 4")
	await walk_to(Vector2i(5, 6))
	game.camera_yaw = -0.65
	game.camera_pitch = 0.40
	game.camera_distance = 14.0
	game._update_camera(1)
	game._update_target()
	game.message.text = ""
	game.menu.hide()
	await create_timer(1.5).timeout
	var present := []
	for structure in game.state.structures: present.append(structure.kind)
	for kind in ["SHELTER", "HEARTH", "MARKER"]:
		if not present.has(kind): failed = true
	print("SCENARIO constructions from harvested materials: ", present)
	var args := OS.get_cmdline_user_args()
	for i in range(args.size() - 1):
		if args[i] == "--capture" and DisplayServer.get_name() != "headless":
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png(args[i + 1])
	await game.backend.finish()
	quit(1 if failed else 0)
