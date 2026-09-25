extends Node

signal updated(state: Dictionary, command: String)
signal failed(message: String)

var process: Dictionary = {}
var pending: Array[String] = []
var active_command := ""
var incoming := PackedByteArray()
var io_pipe: FileAccess
var world_path := ""
var last_latency_ms := 0
var sent_at := 0

func start(core_path: String, save_path: String) -> bool:
	active_command = ""
	pending.clear()
	incoming.clear()
	world_path = save_path
	process = OS.execute_with_pipe(core_path, PackedStringArray(["--serve", "--save", save_path]), false)
	if process.is_empty():
		failed.emit("Impossible d’ouvrir le monde. Le programme Rust est introuvable.")
		return false
	io_pipe = process.stdio
	request("STATE")
	return true

func request(command: String) -> void:
	if command.begins_with("WAIT_") and (not pending.is_empty() or active_command != ""):
		return
	pending.append(command)
	_send_next()

func _send_next() -> void:
	if active_command != "" or pending.is_empty() or io_pipe == null:
		return
	active_command = pending.pop_front()
	sent_at = Time.get_ticks_msec()
	io_pipe.store_string(active_command + "\n")
	io_pipe.flush()

func _process(_delta: float) -> void:
	if io_pipe == null:
		return
	var available := io_pipe.get_length()
	if available > 0:
		incoming.append_array(io_pipe.get_buffer(available))
	var newline := incoming.find(10)
	while newline >= 0:
		var text := incoming.slice(0, newline).get_string_from_utf8()
		incoming = incoming.slice(newline + 1)
		var response = JSON.parse_string(text)
		var completed := active_command
		active_command = ""
		last_latency_ms = Time.get_ticks_msec() - sent_at
		if response is Dictionary and response.get("ok", false):
			updated.emit(response, completed)
		else:
			failed.emit(str(response.get("error", "Réponse illisible")) if response is Dictionary else text)
		_send_next()
		newline = incoming.find(10)
	if active_command != "" and Time.get_ticks_msec() - sent_at > 6000:
		failed.emit("Le monde met trop longtemps à répondre. Ta sauvegarde précédente est conservée.")
		active_command = ""

func stop() -> void:
	if io_pipe != null:
		io_pipe.store_string("QUIT\n")
		io_pipe.flush()
		io_pipe.close()
		io_pipe = null
	if process.has("stderr"):
		process.stderr.close()
	process = {}
	pending.clear()
	incoming.clear()
	active_command = ""

func finish() -> void:
	# Keep reading acknowledgments before closing: every queued gesture is saved.
	var deadline := Time.get_ticks_msec() + 6000
	while (active_command != "" or not pending.is_empty()) and Time.get_ticks_msec() < deadline:
		await get_tree().process_frame
	var pid: int = process.get("pid", -1)
	stop()
	deadline = Time.get_ticks_msec() + 1500
	while pid > 0 and OS.is_process_running(pid) and Time.get_ticks_msec() < deadline:
		await get_tree().process_frame

func _exit_tree() -> void:
	stop()
