"""Compact, export-safe night facade treatment for the Yeouido towers.

The module deliberately puts the window pattern in small packed PNG atlases.
That keeps the GLB light while preserving a real PBR material on each sloped
facade plane.  ``apply_facade_to_mesh`` is designed for the quad side faces
made by build-yeouido's ring_mesh helper; caps are left alone.
"""
import bpy
import math
import os
from array import array


_ATLAS_SIZE = (512, 1024)  # 2 MiB decoded RGBA per image
_ATLAS_ROWS = 56
_ATLAS_COLUMNS = 25
_WINDOW_BAY_METRES = 5.2
_MATERIALS = None


def _pixel_atlases(key, variant):
    """Return paired 8-bit PNG-ready pixels: subdued base and sparse emission."""
    width, height = _ATLAS_SIZE
    base = array("f", [0.0]) * (width * height * 4)
    glow = array("f", [0.0]) * (width * height * 4)
    # Stable integer hash: do not use Python's randomized hash().
    salt = (sum((i + 3) * ord(ch) for i, ch in enumerate(key)) + variant * 191) & 0xFFFF
    palettes = (
        ((0.030, 0.065, 0.081), (0.075, 0.137, 0.158), (0.31, 0.34, 0.34)),
        ((0.038, 0.082, 0.099), (0.093, 0.161, 0.180), (0.34, 0.37, 0.37)),
        ((0.057, 0.105, 0.120), (0.125, 0.190, 0.202), (0.38, 0.40, 0.40)),
    )
    dark, pane, frame = palettes[variant % len(palettes)]
    pitch_x = width / _ATLAS_COLUMNS
    pitch_y = height / _ATLAS_ROWS
    # A floor is occupied in a few continuous office runs, never by isolated
    # random squares.  This yields 25–35% occupancy overall while retaining
    # occasional nearly dark and half-lit floors common in night photographs.
    offices = {}
    for row in range(_ATLAS_ROWS):
        row_hash = (row * 109 + salt * 31 + (row // 5) * 47) & 255
        roll = row_hash % 100
        runs = 0 if roll < 8 else 1 if roll < 24 else 2 if roll < 70 else 3
        for run in range(runs):
            run_hash = (row_hash * 61 + run * 97 + salt * 13) & 255
            start = run_hash % _ATLAS_COLUMNS
            length = 2 + ((run_hash >> 3) % 5)  # two to six adjacent offices
            for col in range(start, min(_ATLAS_COLUMNS, start + length)):
                offices[(row, col)] = ((run_hash + col * 19) % 10 == 0)
    for y in range(height):
        row = min(_ATLAS_ROWS - 1, int(y / pitch_y))
        within_y = (y / pitch_y) - row
        # Fine, quiet mullions and a short dark spandrel leave a distinctly
        # horizontal office opening instead of a dense square grid.
        is_floor_frame = within_y < 0.060 or within_y > 0.875
        for x in range(width):
            col = min(_ATLAS_COLUMNS - 1, int(x / pitch_x))
            within_x = (x / pitch_x) - col
            is_vertical_frame = within_x < 0.040 or within_x > 0.970
            # This integer noise is structured by rooms, rather than pixels.
            room = (row * 73 + col * 37 + salt + (row // 6) * 29) & 255
            blind = 0.50 < within_y < 0.76 and room % 7 == 0
            idx = (y * width + x) * 4
            if is_floor_frame or is_vertical_frame:
                color = frame
            elif blind:
                color = tuple(v * 0.54 for v in pane)
            else:
                # Broad, low-contrast vertical reflection changes help each
                # planar tower facet read as blue-grey glazing, not a flat map.
                reflection = 0.90 + ((col * 7 + variant * 5) % 9) * 0.018
                shade = reflection * (0.88 + (room % 11) * 0.010)
                color = tuple(min(1.0, v * shade) for v in pane)
            base[idx:idx + 4] = array("f", (*color, 1.0))

            lit = (row, col) in offices and not (is_floor_frame or is_vertical_frame or blind)
            warm = lit and offices[(row, col)]
            if lit:
                # Neutral/cool-white dominates; only roughly one tenth of
                # occupied offices is warm, and no saturated blue panes occur.
                e = (0.60, 0.70, 0.75) if not warm else (0.75, 0.63, 0.43)
                glow[idx:idx + 4] = array("f", (*e, 1.0))
            else:
                glow[idx:idx + 4] = array("f", (0.0, 0.0, 0.0, 1.0))
    return base, glow


def _packed_image(name, pixels):
    """Create an ordinary PNG-backed Blender image and pack it for GLB export."""
    image = bpy.data.images.get(name)
    if image:
        return image
    width, height = _ATLAS_SIZE
    image = bpy.data.images.new(name, width=width, height=height, alpha=True, float_buffer=False)
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(pixels)
    image.update()
    # Saving first gives Blender's glTF exporter a conventional, portable image
    # source; pack() then makes the source independent of this temporary path.
    image.filepath_raw = os.path.join("/tmp", name.replace(" ", "_") + ".png")
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def _facade_material(name, variant):
    base_pixels, emission_pixels = _pixel_atlases(name, variant)
    base_image = _packed_image(name + " • BaseColor", base_pixels)
    emission_image = _packed_image(name + " • Emission", emission_pixels)
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Metallic"].default_value = 0.20
    shader.inputs["Roughness"].default_value = 0.35
    shader.inputs["Emission Strength"].default_value = 0.80
    base_tex = nodes.new("ShaderNodeTexImage")
    base_tex.image = base_image
    base_tex.extension = "REPEAT"
    emission_tex = nodes.new("ShaderNodeTexImage")
    emission_tex.image = emission_image
    emission_tex.extension = "REPEAT"
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "Facade atlas UV"
    links = material.node_tree.links
    links.new(uv.outputs["UV"], base_tex.inputs["Vector"])
    links.new(uv.outputs["UV"], emission_tex.inputs["Vector"])
    links.new(base_tex.outputs["Color"], shader.inputs["Base Color"])
    links.new(emission_tex.outputs["Color"], shader.inputs["Emission Color"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def create_facade_materials():
    """Return the three reusable, packed PBR facade materials.

    The materials are intentionally close in value, so tower facets stay
    readable from their own shading and do not turn into unrelated colours.
    """
    global _MATERIALS
    if _MATERIALS is None:
        _MATERIALS = [
            _facade_material("Facade atlas • midnight", 0),
            _facade_material("Facade atlas • blue steel", 1),
            _facade_material("Facade atlas • pale teal", 2),
        ]
    return _MATERIALS


def _point(a, b, c, d, u, v):
    """Bilinear point on a side quad, expressed as a Vector."""
    return (a * (1.0 - u) + b * u) * (1.0 - v) + (d * (1.0 - u) + c * u) * v


def _add_quad(vertices, faces, points, normal):
    first = len(vertices)
    vertices.extend(points)
    # Ensure generated frame planes face out, even if a source ring used the
    # opposite winding convention.
    if (points[1] - points[0]).cross(points[2] - points[0]).dot(normal) < 0:
        faces.append((first, first + 3, first + 2, first + 1))
    else:
        faces.append((first, first + 1, first + 2, first + 3))


def _physical_frames(mesh, side_polygons, floors):
    """Add very thin exterior mullions that conform to each actual quad face."""
    hosts = [obj for obj in bpy.data.objects if obj.type == "MESH" and obj.data == mesh]
    if not hosts:
        return None
    host = hosts[0]
    verts, faces = [], []
    floor_step = max(2.7, (max(v.co.z for v in mesh.vertices) - min(v.co.z for v in mesh.vertices)) / max(1, floors))
    for poly in side_polygons:
        ids = poly.vertices
        if len(ids) != 4:
            continue
        a, b, c, d = (mesh.vertices[i].co.copy() for i in ids)
        # Wider bays and delicate strips read as narrow horizontal windows,
        # instead of turning the facade into a dominant square lattice.
        bays = max(1, min(22, round(((b - a).length + (c - d).length) * 0.5 / _WINDOW_BAY_METRES)))
        height = max((d - a).length, (c - b).length)
        rows = max(1, min(floors, round(height / floor_step)))
        n = poly.normal.normalized() * 0.045
        for row in range(rows + 1):
            v = row / rows
            h = min(0.009, 0.22 / max(height, 1.0))
            p0 = _point(a, b, c, d, 0, max(0, v - h)) + n
            p1 = _point(a, b, c, d, 1, max(0, v - h)) + n
            p2 = _point(a, b, c, d, 1, min(1, v + h)) + n
            p3 = _point(a, b, c, d, 0, min(1, v + h)) + n
            _add_quad(verts, faces, (p0, p1, p2, p3), poly.normal)
        for bay in range(1, bays):
            u = bay / bays
            w = min(0.010, 0.11 / max(((b - a).length + (c - d).length) * 0.5, 1.0))
            p0 = _point(a, b, c, d, max(0, u - w), 0) + n
            p1 = _point(a, b, c, d, min(1, u + w), 0) + n
            p2 = _point(a, b, c, d, min(1, u + w), 1) + n
            p3 = _point(a, b, c, d, max(0, u - w), 1) + n
            _add_quad(verts, faces, (p0, p1, p2, p3), poly.normal)
    if not faces:
        return None
    frame_mesh = bpy.data.meshes.new(host.name + " fine mullion mesh")
    frame_mesh.from_pydata(verts, [], faces)
    frame_mesh.materials.append(_frame_material())
    frame_mesh.update()
    frame_object = bpy.data.objects.new(host.name + " • fine facade frames", frame_mesh)
    collections = list(host.users_collection) or [bpy.context.scene.collection]
    for collection in collections:
        collection.objects.link(frame_object)
    return frame_object


def _frame_material():
    name = "Facade frame • graphite aluminum"
    material = bpy.data.materials.get(name)
    if material:
        return material
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.24, 0.27, 0.27, 1)
    bsdf.inputs["Metallic"].default_value = 0.48
    bsdf.inputs["Roughness"].default_value = 0.38
    return material


def apply_facade_to_mesh(mesh, seed, floors, facade_type="glass"):
    """Map facade atlas and conforming fine mullions onto side faces of *mesh*.

    ``seed`` deterministically offsets each tower's room pattern. ``floors``
    controls vertical texture scale and physical floor ribbons. ``facade_type``
    accepts ``glass``, ``blue`` or ``pale`` (other values select deterministically).
    Caps and strongly horizontal faces are preserved for a roof treatment.
    """
    materials = create_facade_materials()
    choice = {"glass": 0, "dark": 0, "blue": 1, "silver": 2, "pale": 2}.get(str(facade_type).lower())
    if choice is None:
        choice = int(seed) % len(materials)
    material_indices = []
    for material in materials:
        try:
            material_indices.append(mesh.materials[:].index(material))
        except ValueError:
            mesh.materials.append(material)
            material_indices.append(len(mesh.materials) - 1)
    uv_layer = mesh.uv_layers.get("Facade atlas UV") or mesh.uv_layers.new(name="Facade atlas UV")
    mesh.uv_layers.active = uv_layer
    z_min = min(vertex.co.z for vertex in mesh.vertices)
    side_polygons = []
    for face_index, poly in enumerate(mesh.polygons):
        # Caps have vertical normals. A generous cutoff retains sloped/tapered
        # side quads while ignoring roofs and undersides.
        if len(poly.vertices) < 3 or abs(poly.normal.z) > 0.62:
            continue
        side_polygons.append(poly)
        material_variant = (choice + (face_index + int(seed)) % 5 // 4) % len(materials)
        poly.material_index = material_indices[material_variant]
        if len(poly.vertices) != 4:
            continue
        a, b, c, d = (mesh.vertices[i].co for i in poly.vertices)
        lower_width = (b - a).length
        upper_width = (c - d).length
        height = max((d - a).length, (c - b).length, 0.01)
        # The atlas has 25 bays x 56 floors. Each quad starts at a stable phase
        # but maps metres to floors/bays, retaining even floor lines on wedges.
        u0 = ((int(seed) * 17 + face_index * 11) % 97) / 97.0
        floor_step = max(2.7, (max(v.co.z for v in mesh.vertices) - z_min) / max(1, floors))
        bottom_z = (a.z + b.z) * 0.5
        top_z = (c.z + d.z) * 0.5
        v0 = (bottom_z - z_min) / floor_step / _ATLAS_ROWS
        u1 = u0 + ((lower_width + upper_width) * 0.5 / _WINDOW_BAY_METRES) / _ATLAS_COLUMNS
        v1 = (top_z - z_min) / floor_step / _ATLAS_ROWS
        # Ring side quads conventionally run bottom-left, bottom-right,
        # top-right, top-left. UVs follow that perimeter and therefore retain
        # the true asymmetric wedge geometry instead of projecting a rectangle.
        for loop_index, uv in zip(poly.loop_indices, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
            uv_layer.data[loop_index].uv = uv
    _physical_frames(mesh, side_polygons, int(floors))
    mesh.update()
    return materials[choice]
