"""
Procedural "Full Man" generator for Blender (paste into Blender's Text Editor and Run)
Creates a simple low-poly humanoid from primitives and optionally joins into a single mesh.
Also can create a basic armature, apply automatic weights, perform a UV smart-project and optionally export a GLB.
Compatible with Blender 2.8+.
Usage:
- Open Blender, switch to Scripting workspace
- New text block, paste this file and Run Script
- Or save this file and use Text -> Open Text Block -> Run Script
"""

import bpy
from mathutils import Vector, Euler

def ensure_collection(name):
    col = bpy.data.collections.get(name)
    if not col:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col

def remove_previous(name):
    objs = [o for o in bpy.data.objects if o.name.startswith(name)]
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)

def make_material(name, color):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (color[0], color[1], color[2], 1.0)
        mat.use_nodes = False
    return mat

def add_primitive_cube(name, size, location, scale, material=None, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, enter_editmode=False, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(scale) if hasattr(scale, '__iter__') else Vector((scale, scale, scale))
    if material:
        if obj.data.materials:
            obj.data.materials[0] = material
        else:
            obj.data.materials.append(material)
    if collection:
        # Unlink the object from any current collections before linking to the target
        for uc in list(obj.users_collection):
            try:
                uc.objects.unlink(obj)
            except Exception:
                pass
        collection.objects.link(obj)
    return obj

def add_primitive_uv_sphere(name, radius, location, scale, material=None, collection=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, enter_editmode=False, location=location, segments=24, ring_count=12)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(scale)
    if material:
        if obj.data.materials:
            obj.data.materials[0] = material
        else:
            obj.data.materials.append(material)
    if collection:
        # Unlink the object from any current collections before linking to the target
        for uc in list(obj.users_collection):
            try:
                uc.objects.unlink(obj)
            except Exception:
                pass
        collection.objects.link(obj)
    return obj

def add_primitive_cylinder(name, radius, depth, location, rotation, scale, material=None, collection=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, enter_editmode=False, location=location, rotation=rotation, vertices=18)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(scale)
    if material:
        if obj.data.materials:
            obj.data.materials[0] = material
        else:
            obj.data.materials.append(material)
    if collection:
        # Unlink the object from any current collections before linking to the target
        for uc in list(obj.users_collection):
            try:
                uc.objects.unlink(obj)
            except Exception:
                pass
        collection.objects.link(obj)
    return obj


def create_procedural_man(scale=1.0, join_mesh=True, base_name='Procedural_Man'):
    """Create a procedural man.

    Args:
        scale (float): overall size multiplier
        join_mesh (bool): if True, join parts into a single mesh (required for automatic skinning)
        base_name (str): base name prefix for created objects
        add_armature (bool): if True, create a simple armature and auto-skin the mesh
        auto_weight (bool): if True and add_armature True, use automatic weights
        export_glb (bool): if True, exports a GLB file to the working directory (path: f"{base_name}.glb")
    """
    
def create_simple_armature(arm_name, scale=1.0, collection=None):
    """Create a simple humanoid armature and return the armature object."""
    arm_data = bpy.data.armatures.new(arm_name + '_Data')
    arm_obj = bpy.data.objects.new(arm_name, arm_data)
    # unlink from default collections and link to provided collection
    for uc in list(arm_obj.users_collection):
        try:
            uc.objects.unlink(arm_obj)
        except Exception:
            pass
    if collection:
        collection.objects.link(arm_obj)
    else:
        bpy.context.scene.collection.objects.link(arm_obj)

    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_obj.data.edit_bones
    s = scale
    # pelvis
    pelvis = eb.new('pelvis')
    pelvis.head = (0, 0, 0.0 * s)
    pelvis.tail = (0, 0, 0.5 * s)
    # spine
    spine = eb.new('spine')
    spine.head = pelvis.tail
    spine.tail = (0, 0, 1.25 * s)
    spine.parent = pelvis
    # neck and head
    neck = eb.new('neck')
    neck.head = spine.tail
    neck.tail = (0, 0, 1.55 * s)
    neck.parent = spine
    head = eb.new('head')
    head.head = neck.tail
    head.tail = (0, 0, 1.95 * s)
    head.parent = neck

    # left arm
    upper_l = eb.new('upper_arm.L')
    upper_l.head = ( -0.45 * s, 0, 1.45 * s )
    upper_l.tail = ( -0.95 * s, 0, 1.05 * s )
    upper_l.parent = spine
    fore_l = eb.new('forearm.L')
    fore_l.head = upper_l.tail
    fore_l.tail = ( -1.15 * s, 0, 0.65 * s )
    fore_l.parent = upper_l
    hand_l = eb.new('hand.L')
    hand_l.head = fore_l.tail
    hand_l.tail = ( -1.25 * s, 0, 0.45 * s )
    hand_l.parent = fore_l

    # right arm
    upper_r = eb.new('upper_arm.R')
    upper_r.head = ( 0.45 * s, 0, 1.45 * s )
    upper_r.tail = ( 0.95 * s, 0, 1.05 * s )
    upper_r.parent = spine
    fore_r = eb.new('forearm.R')
    fore_r.head = upper_r.tail
    fore_r.tail = ( 1.15 * s, 0, 0.65 * s )
    fore_r.parent = upper_r
    hand_r = eb.new('hand.R')
    hand_r.head = fore_r.tail
    hand_r.tail = ( 1.25 * s, 0, 0.45 * s )
    hand_r.parent = fore_r

    # left leg
    thigh_l = eb.new('thigh.L')
    thigh_l.head = ( -0.2 * s, 0, 0.1 * s )
    thigh_l.tail = ( -0.2 * s, 0, -0.6 * s )
    thigh_l.parent = pelvis
    calf_l = eb.new('calf.L')
    calf_l.head = thigh_l.tail
    calf_l.tail = ( -0.2 * s, 0, -1.15 * s )
    calf_l.parent = thigh_l
    foot_l = eb.new('foot.L')
    foot_l.head = calf_l.tail
    foot_l.tail = ( -0.2 * s, 0.18 * s, -1.2 * s )
    foot_l.parent = calf_l

    # right leg
    thigh_r = eb.new('thigh.R')
    thigh_r.head = ( 0.2 * s, 0, 0.1 * s )
    thigh_r.tail = ( 0.2 * s, 0, -0.6 * s )
    thigh_r.parent = pelvis
    calf_r = eb.new('calf.R')
    calf_r.head = thigh_r.tail
    calf_r.tail = ( 0.2 * s, 0, -1.15 * s )
    calf_r.parent = thigh_r
    foot_r = eb.new('foot.R')
    foot_r.head = calf_r.tail
    foot_r.tail = ( 0.2 * s, 0.18 * s, -1.2 * s )
    foot_r.parent = calf_r

    bpy.ops.object.mode_set(mode='OBJECT')
    arm_obj.select_set(False)
    return arm_obj


def create_procedural_man(scale=1.0, join_mesh=True, base_name='Procedural_Man', add_armature=True, auto_weight=True, export_glb=False):

    col = ensure_collection(base_name + '_COL')
    remove_previous(base_name)

    skin = make_material('Skin_Mat', (0.91, 0.76, 0.65))
    shirt = make_material('Shirt_Mat', (0.12, 0.45, 0.86))
    pants = make_material('Pants_Mat', (0.09, 0.09, 0.12))
    shoe = make_material('Shoe_Mat', (0.05, 0.05, 0.05))

    s = scale

    torso_h = 1.2 * s
    torso = add_primitive_cube(base_name + '_Torso', 1.0, location=(0,0,1.0*s), scale=(0.45*s, 0.25*s, torso_h*0.5), material=shirt, collection=col)

    chest = add_primitive_cube(base_name + '_Chest', 1.0, location=(0,0,1.2*s), scale=(0.47*s, 0.27*s, 0.25*s), material=shirt, collection=col)

    neck = add_primitive_cylinder(base_name + '_Neck', radius=0.12*s, depth=0.18*s, location=(0,0,1.6*s), rotation=(0,0,0), scale=(1,1,1), material=skin, collection=col)

    head = add_primitive_uv_sphere(base_name + '_Head', radius=0.3*s, location=(0,0,1.95*s), scale=(1.0,1.0,1.05), material=skin, collection=col)

    l_upper_arm = add_primitive_cylinder(base_name + '_UpperArm_L', radius=0.12*s, depth=0.8*s, location=(-0.55*s,0,1.45*s), rotation=(0,0,1.57), scale=(1,1,1), material=skin, collection=col)
    r_upper_arm = add_primitive_cylinder(base_name + '_UpperArm_R', radius=0.12*s, depth=0.8*s, location=(0.55*s,0,1.45*s), rotation=(0,0,1.57), scale=(1,1,1), material=skin, collection=col)

    l_forearm = add_primitive_cylinder(base_name + '_Forearm_L', radius=0.10*s, depth=0.72*s, location=(-0.55*s,0,0.85*s), rotation=(0,0,1.57), scale=(1,1,1), material=skin, collection=col)
    r_forearm = add_primitive_cylinder(base_name + '_Forearm_R', radius=0.10*s, depth=0.72*s, location=(0.55*s,0,0.85*s), rotation=(0,0,1.57), scale=(1,1,1), material=skin, collection=col)

    l_hand = add_primitive_cube(base_name + '_Hand_L', 1.0, location=(-0.55*s,0,0.4*s), scale=(0.12*s,0.06*s,0.16*s), material=skin, collection=col)
    r_hand = add_primitive_cube(base_name + '_Hand_R', 1.0, location=(0.55*s,0,0.4*s), scale=(0.12*s,0.06*s,0.16*s), material=skin, collection=col)

    l_thigh = add_primitive_cylinder(base_name + '_Thigh_L', radius=0.16*s, depth=1.0*s, location=(-0.2*s,0,0.1*s), rotation=(0,0,1.57), scale=(1,1,1), material=pants, collection=col)
    r_thigh = add_primitive_cylinder(base_name + '_Thigh_R', radius=0.16*s, depth=1.0*s, location=(0.2*s,0,0.1*s), rotation=(0,0,1.57), scale=(1,1,1), material=pants, collection=col)

    l_calf = add_primitive_cylinder(base_name + '_Calf_L', radius=0.12*s, depth=0.9*s, location=(-0.2*s,0,-0.6*s), rotation=(0,0,1.57), scale=(1,1,1), material=pants, collection=col)
    r_calf = add_primitive_cylinder(base_name + '_Calf_R', radius=0.12*s, depth=0.9*s, location=(0.2*s,0,-0.6*s), rotation=(0,0,1.57), scale=(1,1,1), material=pants, collection=col)

    l_shoe = add_primitive_cube(base_name + '_Shoe_L', 1.0, location=(-0.2*s,0,-1.05*s), scale=(0.20*s,0.30*s,0.10*s), material=shoe, collection=col)
    r_shoe = add_primitive_cube(base_name + '_Shoe_R', 1.0, location=(0.2*s,0,-1.05*s), scale=(0.20*s,0.30*s,0.10*s), material=shoe, collection=col)

    # Adjust origin and parenting
    objs = [o for o in bpy.data.objects if o.name.startswith(base_name)]
    for o in objs:
        o.select_set(False)

    root_empty = bpy.data.objects.new(base_name + '_Root', None)
    col.objects.link(root_empty)
    root_empty.location = (0,0,0)

    for o in objs:
        o.parent = root_empty

    if join_mesh:
        mesh_objs = [o for o in objs if o.type == 'MESH']
        for o in mesh_objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = mesh_objs[0] if mesh_objs else None
        bpy.ops.object.join()
        joined = bpy.context.active_object
        if joined:
            joined.name = base_name
            joined.parent = root_empty
            # set origin to geometry
            bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='MEDIAN')

            # Smart UV unwrap
            try:
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                pass

            # Create a simple armature and auto-skin if requested
            try:
                # Default: create an armature and auto-weight
                arm_name = base_name + '_Armature'
                arm_obj = create_simple_armature(arm_name, scale=s)
                if arm_obj:
                    col.objects.link(arm_obj) if arm_obj.name not in col.objects else None
                    # Ensure only the mesh and armature are selected for parenting
                    joined.select_set(True)
                    arm_obj.select_set(True)
                    bpy.context.view_layer.objects.active = arm_obj
                    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
            except Exception:
                pass

            # Optional export
            if export_glb:
                try:
                    # select only the armature and mesh
                    for o in bpy.context.scene.objects:
                        o.select_set(False)
                    joined.select_set(True)
                    if 'arm_obj' in locals() and arm_obj:
                        arm_obj.select_set(True)
                    bpy.context.view_layer.objects.active = joined
                    bpy.ops.export_scene.gltf(filepath=f"{base_name}.glb", export_format='GLB', export_selected=True)
                except Exception:
                    pass

    return root_empty

if __name__ == '__main__':
    # Defaults: join parts, add a simple armature and auto-skin. Set export_glb=True to save a GLB in the working folder.
    create_procedural_man(scale=1.0, join_mesh=True, add_armature=True, auto_weight=True, export_glb=False)
