extends SceneTree

var failures: Array[String] = []
var game: Node3D

func _initialize() -> void:
	call_deferred("run")

func check(condition: bool, label: String) -> void:
	print(("PASS " if condition else "FAIL ") + label)
	if not condition: failures.append(label)

func run() -> void:
	game = load("res://main.tscn").instantiate()
	root.add_child(game)
	await create_timer(2.0).timeout
	check(game.started, "Rust world received by Godot")
	if not game.started:
		quit(1)
		return
	var original_pid: int = game.backend.process.pid
	var initial_tick: int = game.state.tick
	var position: Vector3 = game.player.position
	Input.action_press("right")
	await create_timer(0.6).timeout
	Input.action_release("right")
	await create_timer(0.4).timeout
	check(game.player.position.distance_to(position) > 0.5, "Continuous physical movement")
	check(game.player.is_on_floor(), "Player collides with terrain")
	check(game.backend.process.pid == original_pid, "One persistent Rust process")
	await create_timer(1.5).timeout
	check(int(game.state.tick) > initial_tick, "World advances without player action")
	game.paused = true
	await create_timer(0.5).timeout
	var paused_tick: int = game.state.tick
	await create_timer(1.5).timeout
	check(int(game.state.tick) == paused_tick, "Pause freezes simulation")
	game._update_target()
	check(game.target.get("type", "") == "resource", "Nearby tree is an interaction target")
	game._interact()
	await create_timer(0.3).timeout
	check(int(game.state.inventory.wood) == 1, "E interaction harvests wood through Rust")
	check(game.resource_nodes[str(Vector2i(5, 5))].get_meta("state") != "active", "Harvest replaces tree with stump in scene")
	game.facing = Vector3.FORWARD
	game._select(5)
	var fence_cell: Vector2i = game.ghost_cell
	check(is_instance_valid(game.ghost), "Construction preview is present")
	game._interact()
	await create_timer(0.4).timeout
	check(game.structure_nodes.has(str(fence_cell)), "Chosen construction appears in actual scene")
	check(not game._passable(fence_cell), "Construction changes collision/navigation")
	await command("DISMANTLE %d %d" % [fence_cell.x, fence_cell.y])
	check(not game.structure_nodes.has(str(fence_cell)), "Dismantling removes scene object")
	check(game._passable(fence_cell), "Dismantling reopens passage")
	var previous_file: String = game.world_file
	var original_tick: int = game.state.tick
	await game._open_world(previous_file.get_base_dir().path_join("second-world.save"))
	game.paused = true
	await create_timer(0.3).timeout
	check(game.started and int(game.state.tick) == 0, "Another world opens without stale pipe responses")
	await game._open_world(previous_file)
	game.paused = true
	await create_timer(0.3).timeout
	check(int(game.state.tick) == original_tick, "Previous world resumes its own history")
	game._save_view()
	check(FileAccess.file_exists(game.world_file + ".view"), "Camera and precise position saved")
	var args := OS.get_cmdline_user_args()
	for i in range(args.size() - 1):
		if args[i] == "--capture" and DisplayServer.get_name() != "headless":
			await RenderingServer.frame_post_draw
			var result := root.get_texture().get_image().save_png(args[i + 1])
			check(result == OK, "Actual 3D viewport captured")
	await game.backend.finish()
	print("3D SMOKE: %d failures" % failures.size())
	quit(0 if failures.is_empty() else 1)

func command(text: String) -> void:
	game.backend.request(text)
	await create_timer(0.15).timeout
