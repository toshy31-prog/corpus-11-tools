extends RefCounted

static func material(color: Color, roughness := 0.9) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	return m

static func mesh(parent: Node3D, shape: Mesh, at: Vector3, color: Color) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = shape
	node.position = at
	node.material_override = material(color)
	parent.add_child(node)
	return node

static func box(parent: Node3D, at: Vector3, dimensions: Vector3, color: Color, solid := false) -> MeshInstance3D:
	var shape := BoxMesh.new()
	shape.size = dimensions
	var node := mesh(parent, shape, at, color)
	if solid:
		var body := StaticBody3D.new()
		var collision := CollisionShape3D.new()
		var bounds := BoxShape3D.new()
		bounds.size = dimensions
		collision.shape = bounds
		body.add_child(collision)
		node.add_child(body)
	return node

static func ball(parent: Node3D, at: Vector3, radius: float, color: Color, scale_y := 1.0) -> MeshInstance3D:
	var shape := SphereMesh.new()
	shape.radius = radius
	shape.height = radius * 2.0
	shape.radial_segments = 8
	shape.rings = 4
	var node := mesh(parent, shape, at, color)
	node.scale.y = scale_y
	return node

static func cylinder(parent: Node3D, at: Vector3, radius: float, height: float, color: Color, top := -1.0) -> MeshInstance3D:
	var shape := CylinderMesh.new()
	shape.bottom_radius = radius
	shape.top_radius = radius if top < 0 else top
	shape.height = height
	shape.radial_segments = 7
	return mesh(parent, shape, at, color)

static func tree(parent: Node3D, at: Vector3, factor := 1.0, living := true, conifer := false) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = at
	cylinder(root, Vector3(0, 1.1, 0), 0.24, 2.2, Color("745139"), 0.14)
	var body := StaticBody3D.new()
	var collider := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 0.3 * factor
	shape.height = 1.9 * factor
	collider.shape = shape
	collider.position.y = 0.95 * factor
	body.add_child(collider)
	root.add_child(body)
	if living:
		if conifer:
			for i in range(3):
				cylinder(root, Vector3(0, 1.9 + i * 0.85, 0), 1.5 - i * 0.3, 2.0, Color("315b4c").lightened(i * 0.03), 0.0)
		else:
			ball(root, Vector3(0, 2.9, 0), 1.4, Color("668652"), 0.9)
			ball(root, Vector3(-0.8, 2.55, 0.4), 1.0, Color("4e7350"))
			ball(root, Vector3(0.6, 3.2, -0.3), 0.95, Color("84a05d"))
	else:
		box(root, Vector3(0.4, 1.9, 0), Vector3(0.8, 0.18, 0.18), Color("80664c")).rotation.z = 0.55
	for child in root.get_children():
		if child is MeshInstance3D:
			child.scale *= factor
			child.position *= factor
	return root

static func resource(parent: Node3D, data: Dictionary, at: Vector3) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = at
	var active: bool = data.state == "active"
	if data.kind == "bois":
		if active:
			tree(root, Vector3.ZERO)
		else:
			cylinder(root, Vector3(0, 0.2, 0), 0.36, 0.4, Color("836449"))
			cylinder(root, Vector3(0, 0.41, 0), 0.29, 0.03, Color("cfaa74"))
	elif data.kind == "pierre":
		for i in range(3 if active else 1):
			var rock := ball(root, Vector3((i - 1) * 0.55, 0.3, i * 0.18), 0.65 if active else 0.2, Color("8b938b"), 0.7)
			rock.rotation = Vector3(i * 0.3, i * 1.1, i * 0.2)
		if active:
			box(root, Vector3(0, 0.45, 0), Vector3(1.4, 0.9, 1.1), Color(0, 0, 0, 0), true).visible = false
	else:
		for i in range(7 if active else 2):
			var offset := Vector3(sin(i * 2.1) * 0.55, 0, cos(i * 2.1) * 0.45)
			cylinder(root, offset + Vector3(0, 0.45, 0), 0.035, 0.9, Color("6e8650"))
			ball(root, offset + Vector3(0, 0.9, 0), 0.12, Color("d5b45d"), 2.2)
	return root

static func person(parent: Node3D, color: Color, player := false) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	box(root, Vector3(0, 1.0, 0), Vector3(0.66, 0.75, 0.4), color)
	ball(root, Vector3(0, 1.61, 0), 0.24, Color("d6ac80"), 1.12)
	cylinder(root, Vector3(0, 1.82, 0), 0.3, 0.09, Color("735634"))
	cylinder(root, Vector3(0, 1.88, 0), 0.22, 0.18, Color("8c6c41"), 0.18)
	box(root, Vector3(0, 1.34, -0.225), Vector3(0.5, 0.16, 0.04), Color("d69a4c"))
	for side in [-1, 1]:
		var leg := Node3D.new()
		leg.name = "leg_l" if side == -1 else "leg_r"
		root.add_child(leg)
		leg.position = Vector3(side * 0.17, 0.71, 0)
		box(leg, Vector3(0, -0.28, 0), Vector3(0.22, 0.55, 0.23), Color("344c4b"))
		box(leg, Vector3(0, -0.56, -0.07), Vector3(0.25, 0.14, 0.37), Color("4d382d"))
		var arm := Node3D.new()
		arm.name = "arm_l" if side == -1 else "arm_r"
		root.add_child(arm)
		arm.position = Vector3(side * 0.43, 1.27, 0)
		box(arm, Vector3(0, -0.2, 0), Vector3(0.2, 0.48, 0.23), color.darkened(0.07))
		ball(arm, Vector3(0, -0.46, 0), 0.105, Color("d6ac80"))
	if player:
		box(root, Vector3(0, 1.05, 0.34), Vector3(0.54, 0.65, 0.25), Color("855638"))
		cylinder(root, Vector3(0, 1.45, 0.39), 0.14, 0.63, Color("7c9986")).rotation.z = PI / 2
	return root

static func animate_person(root: Node3D, clock: float, walking: float, action := 0.0) -> void:
	for side in [-1, 1]:
		var leg: Node3D = root.get_node("leg_l" if side == -1 else "leg_r")
		var arm: Node3D = root.get_node("arm_l" if side == -1 else "arm_r")
		leg.rotation.x = sin(clock * 10) * 0.65 * walking * side
		arm.rotation.x = -sin(clock * 10) * 0.5 * walking * side - sin(action * PI) * 1.5

static func structure(parent: Node3D, kind: String, at: Vector3, active := true, preview := false) -> Node3D:
	var root := Node3D.new()
	parent.add_child(root)
	root.position = at
	var timber := Color("9e754e") if active else Color("665d52")
	match kind:
		"MARKER":
			cylinder(root, Vector3(0, 1.3, 0), 0.1, 2.6, timber)
			box(root, Vector3(0.45, 2.15, 0), Vector3(0.9, 0.52, 0.04), Color("dcb54c"))
		"HEARTH":
			for i in range(9):
				ball(root, Vector3(sin(i * TAU / 9) * 0.65, 0.12, cos(i * TAU / 9) * 0.65), 0.22, Color("899180"), 0.6)
			for i in range(3):
				box(root, Vector3(0, 0.17 + i * 0.08, 0), Vector3(0.9, 0.16, 0.16), timber).rotation.y = i * 1.3
			if active:
				var flame := cylinder(root, Vector3(0, 0.52, 0), 0.3, 0.8, Color("ee8840"), 0.0)
				var m := material(Color("ee8840"))
				m.emission_enabled = true
				m.emission = Color("ffac49")
				flame.material_override = m
				var light := OmniLight3D.new()
				light.position.y = 1.2
				light.light_color = Color("ffd09a")
				light.light_energy = 2.0
				light.omni_range = 7.0
				root.add_child(light)
			box(root, Vector3(1.25, 0.4, 0), Vector3(0.5, 0.5, 1.6), timber, not preview)
		"BRIDGE":
			for i in range(10):
				box(root, Vector3(0, 0.18, (i - 4.5) * 0.41), Vector3(3.9, 0.28, 0.38), timber, not preview)
			for x in [-1.75, 1.75]:
				for z in [-1.8, 1.8]:
					box(root, Vector3(x, 0.8, z), Vector3(0.13, 1.3, 0.13), timber)
				box(root, Vector3(x, 1.3, 0), Vector3(0.12, 0.1, 4), timber)
		"SHELTER", "WORKSHOP":
			for x in [-1.45, 1.45]:
				for z in [-1.2, 1.2]:
					box(root, Vector3(x, 1.25, z), Vector3(0.18, 2.5, 0.18), timber, not preview)
			for side in [-1, 1]:
				var roof := box(root, Vector3(side * 0.88, 2.7, 0), Vector3(2.02, 0.18, 3.3), Color("6b705a"))
				roof.rotation.z = -side * 0.48
			box(root, Vector3(0, 1.1, 1.23), Vector3(3, 2.2, 0.13), timber, not preview)
			if kind == "WORKSHOP":
				box(root, Vector3(0, 0.9, 0), Vector3(2.1, 0.18, 1.3), timber, not preview)
				box(root, Vector3(0.4, 1.18, 0), Vector3(0.45, 0.3, 0.3), Color("68716a"))
			else:
				box(root, Vector3(0.7, 0.22, 0), Vector3(0.9, 0.35, 1.7), Color("b8a373"))
		"FENCE":
			for x in [-1.6, 0, 1.6]:
				box(root, Vector3(x, 0.75, 0), Vector3(0.14, 1.5, 0.18), timber)
			for y in [0.4, 1.1]:
				box(root, Vector3(0, y, 0), Vector3(3.6, 0.18, 0.18), timber, not preview)
		"STORE":
			box(root, Vector3(0, 0.45, 0), Vector3(1.5, 0.9, 1.15), timber, not preview)
			for y in [0.15, 0.55, 0.85]:
				box(root, Vector3(0, y, -0.59), Vector3(1.55, 0.035, 0.06), Color("5c4533"))
			box(root, Vector3(0, 0.72, -0.63), Vector3(0.17, 0.23, 0.06), Color("b4a16f"))
		"RECOVERY":
			for i in range(8):
				var p := Vector3(sin(i * TAU / 8) * 1.1, 0, cos(i * TAU / 8) * 1.1)
				cylinder(root, p + Vector3(0, 0.4, 0), 0.05, 0.8, Color("659150"))
				ball(root, p + Vector3(0, 0.8, 0), 0.18, Color("a6b76f"), 0.7)
	if preview:
		ghost_material(root, Color(0.56, 0.85, 0.63, 0.45))
	return root

static func ghost_material(root: Node, color: Color) -> void:
	for node in root.get_children():
		if node is MeshInstance3D:
			var m := material(color)
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			node.material_override = m
			node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		ghost_material(node, color)
