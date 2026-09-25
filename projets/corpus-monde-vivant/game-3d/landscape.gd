extends RefCounted

const Models = preload("res://models.gd")
const CELL := 4.0

static func surface_height(x: float, z: float) -> float:
	var pond_a := minf(minf(x - 8, 20 - x), minf(z - 8, 16 - z))
	var pond_b := minf(minf(x - 60, 68 - x), minf(z - 28, 40 - z))
	if maxf(pond_a, pond_b) > -0.6:
		return lerpf(0.10, -0.9, smoothstep(-0.6, 0.7, maxf(pond_a, pond_b)))
	var edge := maxf(maxf(4 - x, x - 68), maxf(4 - z, z - 44))
	var hill := maxf(0, edge) * 0.43
	return sin(x * 0.13) * cos(z * 0.14) * 0.22 + hill + maxf(0, sin(x * 0.09 + z * 0.08)) * hill * 0.4

static func point(cell: Vector2i) -> Vector3:
	var x := (cell.x + 0.5) * CELL
	var z := (cell.y + 0.5) * CELL
	return Vector3(x, maxf(0.02, surface_height(x, z)), z)

static func create(parent: Node3D) -> void:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	var step := 1.5
	for zi in range(-10, 44):
		for xi in range(-10, 60):
			var x := xi * step
			var z := zi * step
			var a := Vector3(x, surface_height(x, z), z)
			var b := Vector3(x + step, surface_height(x + step, z), z)
			var c := Vector3(x, surface_height(x, z + step), z + step)
			var d := Vector3(x + step, surface_height(x + step, z + step), z + step)
			for triangle in [[a, b, c], [b, d, c]]:
				for vertex in triangle:
					surface.set_color(ground_color(vertex.x, vertex.z))
					surface.add_vertex(vertex)
	surface.index()
	surface.generate_normals()
	var terrain := MeshInstance3D.new()
	terrain.mesh = surface.commit()
	var mat := StandardMaterial3D.new()
	mat.vertex_color_use_as_albedo = true
	mat.vertex_color_is_srgb = true
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	mat.roughness = 1.0
	terrain.material_override = mat
	parent.add_child(terrain)
	terrain.create_trimesh_collision()
	var water_material := ShaderMaterial.new()
	water_material.shader = preload("res://water.gdshader")
	for area in [Rect2(8, 8, 12, 8), Rect2(60, 28, 8, 12)]:
		var mesh := PlaneMesh.new()
		mesh.size = area.size
		mesh.subdivide_width = 20
		mesh.subdivide_depth = 20
		var water := MeshInstance3D.new()
		water.mesh = mesh
		water.material_override = water_material
		water.position = Vector3(area.get_center().x, -0.04, area.get_center().y)
		parent.add_child(water)
	decorate(parent)

static func ground_color(x: float, z: float) -> Color:
	var variation := sin(x * 1.7 + z * 2.3) * 0.017
	if absf(z - 22) < 1.35 or (absf(x - 38) < 1.2 and z > 8 and z < 40):
		return Color("b7aa83").lightened(variation)
	if surface_height(x, z) < -0.05:
		return Color("9c9b76")
	if x < 3 or x > 69 or z < 3 or z > 45:
		return Color("7a8d73").darkened(variation * 2)
	return Color("8caa77").lightened(variation)

static func decorate(parent: Node3D) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 271822
	for i in range(92):
		var x := rng.randf_range(-8, 80)
		var z := rng.randf_range(-6, 57)
		if x > 5 and x < 67 and z > 5 and z < 43:
			continue
		Models.tree(parent, Vector3(x, surface_height(x, z), z), rng.randf_range(1.1, 1.8), true, i % 3 == 0)
	for i in range(17):
		var theta := float(i) / 17 * TAU
		var p := Vector3(36 + cos(theta) * 77, 0, 24 + sin(theta) * 66)
		var mountain := Models.cylinder(parent, p + Vector3(0, 7, 0), 12, rng.randf_range(19, 29), Color("8eaaa6"), 1.5)
		mountain.rotation.y = rng.randf_range(0, TAU)
	# Grass is actual instanced geometry. It is neither an overlay nor a tile texture.
	var blade := ArrayMesh.new()
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = PackedVector3Array([Vector3(-0.12, 0, 0), Vector3(0, 0.44, 0), Vector3(0.12, 0, 0), Vector3(0, 0, -0.12), Vector3(0, 0.35, 0), Vector3(0, 0, 0.12)])
	arrays[Mesh.ARRAY_NORMAL] = PackedVector3Array([Vector3.UP, Vector3.UP, Vector3.UP, Vector3.UP, Vector3.UP, Vector3.UP])
	blade.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	var multimesh := MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.use_colors = true
	multimesh.mesh = blade
	multimesh.instance_count = 2600
	for i in range(2600):
		var x := rng.randf_range(4.2, 67.8)
		var z := rng.randf_range(4.2, 43.8)
		var h := surface_height(x, z)
		var visible := h > -0.05 and absf(z - 22) > 1.8 and absf(x - 38) > 1.6
		var factor := rng.randf_range(0.6, 1.3) if visible else 0.0
		var basis := Basis(Vector3.UP, rng.randf_range(0, TAU)).scaled(Vector3.ONE * factor)
		multimesh.set_instance_transform(i, Transform3D(basis, Vector3(x, h, z)))
		multimesh.set_instance_color(i, Color("7d975e").lightened(rng.randf_range(0, 0.15)))
	var grass := MultiMeshInstance3D.new()
	grass.multimesh = multimesh
	var grass_mat := Models.material(Color.WHITE)
	grass_mat.vertex_color_use_as_albedo = true
	grass_mat.vertex_color_is_srgb = true
	grass_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	grass.material_override = grass_mat
	parent.add_child(grass)

static func footpath(parent: Node3D, cell: Vector2i, state: String) -> Node3D:
	var p := point(cell)
	var root := Node3D.new()
	parent.add_child(root)
	var width := 0.65 if state == "trail" else 1.3
	Models.box(root, p + Vector3(0, 0.02, 0), Vector3(3.9, 0.035, width), Color("b5a47c"))
	Models.box(root, p + Vector3(0, 0.025, 0), Vector3(width, 0.035, 3.9), Color("b5a47c"))
	return root
