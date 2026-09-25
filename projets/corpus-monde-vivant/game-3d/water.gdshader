shader_type spatial;
render_mode cull_disabled;
varying vec3 local_position;
void vertex() {
    local_position = VERTEX;
    VERTEX.y += sin(VERTEX.x * 2.0 + TIME * 0.7) * 0.018 + cos(VERTEX.z * 1.7 + TIME) * 0.015;
}
void fragment() {
    float ripple = pow(max(0.0, sin(local_position.x * 4.0 + TIME) * cos(local_position.z * 3.0 - TIME * 0.8)), 12.0);
    ALBEDO = mix(vec3(0.19, 0.43, 0.46), vec3(0.65, 0.8, 0.75), ripple * 0.38);
    ROUGHNESS = 0.24;
    METALLIC = 0.25;
}
