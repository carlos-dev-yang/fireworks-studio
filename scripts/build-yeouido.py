#!/usr/bin/env python3
"""Build the Yeouido night skyline as an editable Blender scene and GLB.

Run with Blender: blender -b --python scripts/build-yeouido.py
Blender is Z-up.  The glTF export maps Blender -Y to the viewer-facing +Z.
"""
import bpy, math, random, os, sys
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
from yeouido_facades import apply_facade_to_mesh

random.seed(24091963)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_BLEND = os.path.join(ROOT, 'assets/yeouido/yeouido-city.blend')
OUT_GLB = os.path.join(ROOT, 'public/models/yeouido-night-skyline.glb')
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)

# start clean, so repeated generations are deterministic
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
ROOTCOL = bpy.context.scene.collection
ROOTCOL.children.unlink(bpy.data.collections['Collection'])
bpy.data.collections.remove(bpy.data.collections['Collection'])

def mat(name, color, metallic=0.0, rough=.55, emission=None):
    m=bpy.data.materials.new(name); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metallic; bs.inputs['Roughness'].default_value=rough
    if emission:
        bs.inputs['Emission Color'].default_value=(*emission[0],1); bs.inputs['Emission Strength'].default_value=emission[1]
    return m

GLASS=mat('Glass • midnight navy',(0.025,.105,.18),.62,.23)
GLASS_LITE=mat('Glass • readable blue',(.055,.18,.29),.48,.28)
GLASS_PALE=mat('Glass • silver blue',(.19,.32,.38),.55,.25)
LIT=mat('Facade atlas • warm offices',(1.0,.46,.12),.05,.38,((1.0,.28,.04),1.5))
COOL_LIT=mat('Facade atlas • cool offices',(.24,.63,1.0),.1,.32,((.12,.42,1.0),1.0))
CONCRETE=mat('Stone / concrete',(.17,.19,.20),.05,.7)
LIGHT_STONE=mat('Pale stone',(.48,.49,.45),.05,.65)
RED=mat('Parc1 red exoskeleton',(.48,.015,.025),.35,.35,((.90,.012,.020),1.15))
BROWN=mat('Brown office cladding',(.20,.105,.065),.3,.46)
ASPHALT=mat('Road asphalt',(.035,.045,.055),.1,.78)
GRASS=mat('Park grass',(.025,.105,.055),0,.9)
PATH=mat('Park paths',(.35,.30,.21),.0,.72)
FOLIAGE=mat('Tree foliage',(.02,.12,.065),.0,.85)
TRUNK=mat('Tree trunks',(.10,.055,.025),.0,.85)
WHITE=mat('Helipad / roof',(.62,.68,.67),.35,.35)
ROOF=mat('Dark roof metal',(.065,.085,.095),.55,.38)

def collection(name):
    c=bpy.data.collections.new(name); ROOTCOL.children.link(c); return c

def link(o,c):
    for x in list(o.users_collection): x.objects.unlink(o)
    c.objects.link(o)

def box(name, loc, scale, material, c, bevel=0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o=bpy.context.object; o.name=name; o.scale=(scale[0]/2,scale[1]/2,scale[2]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material: o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('corner chamfers','BEVEL'); mod.width=bevel; mod.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    link(o,c); return o

def cyl(name, loc, radius, depth, material, c, verts=12, scale_y=1):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o=bpy.context.object; o.name=name; o.scale.y=scale_y; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); link(o,c); return o

def canopy(name, loc, radius, material, c, squash=1.0):
    """A low-poly broadleaf crown; paired crowns avoid a regimented cone-tree row."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=loc)
    o=bpy.context.object; o.name=name; o.scale=(1.0, squash, random.uniform(.62,.90))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); link(o,c); return o

def ring_mesh(name, x,y, rings, material, c, sides=8, rot=math.pi/8, facade_type='glass'):
    # Standard office towers are chamfered rectangles, never radial vase forms.
    # rings: (z, half-width, half-depth); changing rings makes honest sloping faces.
    vs=[]; fs=[]
    for ring in rings:
        z,rx,ry=ring[:3]; ox,oy=(ring[3],ring[4]) if len(ring)>3 else (0,0)
        chamfer=min(4.5, rx*.16, ry*.16)
        profile=[(-rx+chamfer,-ry),(rx-chamfer,-ry),(rx,-ry+chamfer),(rx,ry-chamfer),(rx-chamfer,ry),(-rx+chamfer,ry),(-rx,ry-chamfer),(-rx,-ry+chamfer)]
        for px,py in profile: vs.append((x+ox+px,y+oy+py,z))
    sides=8
    for j in range(len(rings)-1):
        for i in range(sides): fs.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    fs.append(tuple(range(sides-1,-1,-1))); fs.append(tuple((len(rings)-1)*sides+i for i in range(sides)))
    me=bpy.data.meshes.new(name+' mesh'); me.from_pydata(vs,[],fs); me.materials.append(material); me.update()
    o=bpy.data.objects.new(name,me); c.objects.link(o)
    apply_facade_to_mesh(me, seed=sum(ord(ch) for ch in name), floors=max(18,round(rings[-1][0]/4.3)), facade_type=facade_type)
    return o

def wedge_mesh(name, x, y, rings, material, c, facade_type='blue'):
    """An asymmetric six-sided commercial tower, with offset rings and true lean planes."""
    profile=[(-1.00,-.92),(.74,-1.00),(1.00,-.28),(.79,1.00),(-.53,.88),(-1.00,.18)]
    vs=[]; fs=[]; n=len(profile)
    # z, half width, half depth, x drift, y drift.  Drifts create the photo-like shoulder.
    for z,rx,ry,ox,oy in rings:
        for px,py in profile: vs.append((x+ox+px*rx,y+oy+py*ry,z))
    for j in range(len(rings)-1):
        for i in range(n): fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    fs.append(tuple(range(n-1,-1,-1))); fs.append(tuple((len(rings)-1)*n+i for i in range(n)))
    me=bpy.data.meshes.new(name+' mesh'); me.from_pydata(vs,[],fs); me.materials.append(material); me.update()
    o=bpy.data.objects.new(name,me); c.objects.link(o)
    apply_facade_to_mesh(me, seed=sum(ord(ch) for ch in name), floors=max(18,round(rings[-1][0]/4.3)), facade_type=facade_type)
    return o

def facade_ribs(name,x,y,z0,z1,w,d,c,primary=GLASS,spacing=14):
    # Physical floor ribbons plus corner piers and a sparse alternating office atlas.
    for z in range(int(z0+8),int(z1),12):
        bandmat = LIT if (z//12)%5 in (0,1) else COOL_LIT if (z//12)%7==0 else primary
        box(name+' floor', (x,y-d/2-.45,z), (w*.88,.8,2.2), bandmat,c)
        box(name+' rear floor', (x,y+d/2+.45,z), (w*.88,.8,2.2), bandmat,c)
        box(name+' side floor', (x-w/2-.45,y,z), (.8,d*.88,2.2), bandmat,c)
        box(name+' side floor', (x+w/2+.45,y,z), (.8,d*.88,2.2), bandmat,c)
    # Genuine 3D corner columns.  Do not use wall-sized strips here: they hide the glazing.
    for dx in (-w/2-.5,w/2+.5):
        for dy in (-d/2-.5,d/2+.5): box(name+' corner pier',(x+dx,y+dy,z1/2),(2.2,2.2,z1),CONCRETE,c)

def _beam_between(name, a, b, material, c, thickness=.7):
    mid=(a+b)*.5; length=(a-b).length
    o=box(name,mid,(thickness,thickness,length),material,c)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return o

def attached_diagrid(name, host, side_index, c, material=WHITE):
    """Fine 3×5 diamonds bilinearly glued to an actual upper wedge facade."""
    me=host.data; n=6
    side_faces=[p for p in me.polygons if len(p.vertices)==4 and p.index % n == side_index]
    # upper ~60% of the selected sloping side, using its real ring quads
    side_faces=side_faces[-2:]
    for fi,p in enumerate(side_faces):
        ids=p.vertices; a,b,cc,d=(me.vertices[i].co.copy() for i in ids)
        rows=2 if fi==0 else 3
        normal=p.normal.normalized()*.16
        def point(u,v): return ((a*(1-u)+b*u)*(1-v)+(d*(1-u)+cc*u)*v)+normal
        for row in range(rows):
            for col in range(3):
                u0=col/3; u1=(col+1)/3; v0=row/rows; v1=(row+1)/rows
                _beam_between(name+' diamond',point(u0,v0),point(u1,v1),material,c,.68)
                _beam_between(name+' diamond',point(u1,v0),point(u0,v1),material,c,.68)

def tower(name,x,y,levels,c,facade=GLASS,sides=8, ribs=False):
    # level list gives changing widths/depths and deliberately creates multi-plane shoulders
    facade_type = 'pale' if facade == GLASS_PALE else 'blue' if facade == GLASS_LITE else 'dark' if facade == GLASS else 'glass'
    ring_mesh(name+' faceted volume',x,y,levels,facade,c,sides,facade_type=facade_type)

def roof_deck(name,x,y,z,w,d,c):
    box(name+' flush dark roof',(x,y,z),(w,d,2),ROOF,c,1)
    # varied, small plant boxes read as real roof service rather than identical table tops
    salt=sum(ord(k) for k in name)
    for i in range(2+(salt%2)):
        px=(-.25 + ((salt+i*17)%7)/12)*w; py=(-.22 + ((salt+i*11)%6)/11)*d
        box(name+' roof plant '+str(i),(x+px,y+py,z+3.5),(w*(.10+(i%2)*.035),d*(.10+((i+1)%2)*.035),5+i),CONCRETE,c,.5)

def sloped_wedge_roof(name,x,y,z,w,d,c):
    """A roof cap whose top deliberately rises toward the rear shoulder."""
    p=[(-1,-.9),(.74,-1),(1,-.28),(.78,1),(-.55,.88),(-1,.18)]
    vs=[]
    for zz in (z-2,z+2):
        for i,(px,py) in enumerate(p):
            rise=(py+1)*3.4 + (1.8 if i in (3,4) else 0)
            vs.append((x+px*w,y+py*d,zz+(rise if zz>z else 0)))
    n=len(p); faces=[]
    for i in range(n): faces.append((i,(i+1)%n,n+(i+1)%n,n+i))
    faces += [tuple(range(n-1,-1,-1)),tuple(n+i for i in range(n))]
    me=bpy.data.meshes.new(name+' mesh'); me.from_pydata(vs,[],faces); me.materials.append(WHITE); me.update()
    o=bpy.data.objects.new(name,me); c.objects.link(o); return o

# Front park: finite 220m deep, planted and wound with paths.  (Blender -Y is viewer/front.)
park=collection('01 • Yeouido riverside park')
box('finite riverside park',(0,-165,-2),(980,230,4),GRASS,park,1)
box('rear boulevard',(0,-32,1),(1000,22,3),ASPHALT,park,1)
for x in range(-460,481,92):
    box('boulevard median lamp base',(x,-32,4),(2,2,7),LIGHT_STONE,park)

def path(points, width=7):
    # rectangular segments keep export resilient and show an articulated winding path
    for a,b in zip(points,points[1:]):
        dx=b[0]-a[0]; dy=b[1]-a[1]; L=math.hypot(dx,dy)
        o=box('winding park path',((a[0]+b[0])/2,(a[1]+b[1])/2,1),(L,width,2),PATH,park,1)
        o.rotation_euler[2]=math.atan2(dy,dx)
path([(-480,-245),(-330,-180),(-180,-220),(0,-155),(150,-205),(315,-140),(480,-190)])
path([(-410,-92),(-280,-130),(-95,-95),(80,-125),(230,-74),(440,-110)],5)
cyl('riverside park plaza',(-125,-164,1),24,2,PATH,park,24,scale_y=.72)
# Loose broadleaf groves make a real urban park while leaving the winding paths and plaza legible.
groves=[(-410,-205),(-325,-130),(-235,-225),(-85,-180),(45,-225),(140,-125),(265,-205),(365,-125),(440,-220)]
for i in range(210):
    gx,gy=groves[i%len(groves)]; x=gx+random.gauss(0,29); y=gy+random.gauss(0,20)
    x=max(-465,min(465,x)); y=max(-255,min(-70,y))
    # preserve a small open plaza
    if (x+125)**2+(y+164)**2 < 36**2: continue
    h=random.uniform(8,19); r=random.uniform(4.3,8.7)
    cyl('park tree trunk',(x,y,h*.18),random.uniform(.7,1.25),h*.36,TRUNK,park,8)
    canopy('park broadleaf crown',(x,y,h*.62),r,FOLIAGE,park,random.uniform(.68,1.30))
    if i % 2:
        canopy('park offset crown',(x+random.uniform(-3.5,3.5),y+random.uniform(-3.5,3.5),h*.70),r*.64,FOLIAGE,park,random.uniform(.68,1.30))

# Main IFC ensemble: three visible unequal faceted glass volumes on a deep connecting podium.
ifc=collection('02 • IFC • main ensemble')
box('IFC deep connected podium',(-60,55,15),(315,122,30),CONCRETE,ifc,5)
box('IFC glowing lobby ribbon',(-60,-7,19),(295,2.5,10),LIT,ifc)
# tallest: tapered in both axes, faceted and crowned by an elevated elliptic helipad
tower('IFC main tower',-76,43,[(0,51,37,0,0),(165,50,36,1,0),(275,48,34,3,1),(306,46,33,5,2)],ifc,GLASS_PALE,8)
roof_deck('IFC main tower',-71,45,309,83,61,ifc)
for dx in (-21,21):
    for dy in (-10,10): cyl('IFC helipad short support',(-71+dx,45+dy,315),1.4,6,WHITE,ifc,10)
cyl('IFC elliptical helipad',(-71,45,319),35,2.2,WHITE,ifc,24,scale_y=.57)
cyl('IFC helipad dark centre',(-71,45,320.3),25,0.8,GLASS,ifc,24,scale_y=.57)
# Lower asymmetrical wedge towers
ifc_west=wedge_mesh('IFC west wedge faceted',-190,4,[(0,43,34,0,0),(75,41,30,-3,1),(176,30,24,7,5),(208,23,17,13,9)],GLASS_LITE,ifc,'blue')
sloped_wedge_roof('IFC west wedge sloping roof',-177,13,211,25,18,ifc)
attached_diagrid('IFC west wedge lattice',ifc_west,0,ifc)
ifc_east=wedge_mesh('IFC east wedge faceted',18,73,[(0,46,35,0,0),(95,43,30,2,-3),(190,32,23,-5,5),(235,25,17,-12,9)],GLASS_LITE,ifc,'blue')
roof_deck('IFC east wedge',18,73,238,54,38,ifc)
attached_diagrid('IFC east wedge lattice',ifc_east,0,ifc)

# Parc1 is far left, offset behind the IFC sightline: unequal red exoskeleton twin towers.
parc=collection('03 • Parc1 • red exoskeleton twins')
box('Parc1 stepped podium',(-355,115,13),(188,105,26),CONCRETE,parc,4)
for name,x,y,h,w,d in [('Parc1 tall',-320,108,338,35,30),('Parc1 short',-405,142,265,31,28)]:
    tower(name,x,y,[(0,w,d),(h*.42,w*.995,d*.99),(h*.80,w*.985,d*.98),(h,w*.97,d*.965)],parc,GLASS_PALE,8)
    # red structural edges on every side, expressed separately from windows
    for dx in (-w*.92,w*.92):
        for dy in (-d*.92,d*.92): box(name+' red corner column',(x+dx,y+dy,h/2),(3.8,3.8,h),RED,parc)
    for zz in (h*.34,h*.68):
        box(name+' flush red belt',(x,y,zz),(w*2.03,d*2.03,2.4),RED,parc,.4)
    box(name+' red roof cap',(x,y,h+3),(w*2.13,d*2.13,4),RED,parc,.8)
    roof_deck(name,x,y,h+6,w*1.95,d*1.95,parc)

# Secondary east skyline is intentionally in three depth bands, varied in silhouette.
east=collection('04 • East secondary cluster')
box('east deep podium',(278,94,14),(420,160,28),CONCRETE,east,5)
box('east office lobby lights',(278,10,18),(390,2.5,9),LIT,east)
# rounded/chamfered brown office at front
tower('Brown chamfered office',145,14,[(0,38,28),(96,37,27),(151,31,24)],east,BROWN,10)
roof_deck('Brown chamfered office',145,14,154,62,48,east)
# banded midrise
tower('Banded midrise',245,25,[(0,37,30),(122,37,30),(156,31,25)],east,GLASS_LITE,8)
for z in range(18,150,17): box('banded midrise bright belt',(245, -6,z),(58,2,3),COOL_LIT,east)
roof_deck('Banded midrise',245,25,159,63,50,east)
# Right tower with an overhanging deep crown
tower('East crown tower',370,35,[(0,36,30),(185,34,28),(235,30,25),(270,26,23)],east,GLASS,8)
box('East crown overhang',(370,35,276),(74,64,12),WHITE,east,2)
box('East crown shadow gap',(370,35,269),(52,46,6),GLASS,east,1)
# rear dark slab, clearly behind the front row
tower('Rear dark slab',405,190,[(0,43,19),(190,41,18),(218,38,17)],east,GLASS,8)
roof_deck('Rear dark slab',405,190,221,75,34,east)
# scattered rear and middle depth band pieces
for idx,(x,y,h,w,d,ma) in enumerate([ (82,138,112,26,21,GLASS), (170,166,132,30,22,GLASS_PALE), (280,174,98,24,18,BROWN), (330,135,127,25,20,GLASS_LITE), (490,106,150,31,22,GLASS), (-265,65,118,28,21,GLASS), (-470,152,130,34,23,BROWN) ]):
    tower('Secondary '+str(idx),x,y,[(0,w,d),(h*.72,w*.92,d*.9),(h,w*.8,d*.75)],east,ma,8)
    roof_deck('Secondary '+str(idx),x,y,h+3,w*1.7,d*1.7,east)

# Make an editable hierarchy: landmark -> individually selectable building -> compact mesh batches.
districts=(park,ifc,parc,east)
building_keys={
    park:['Park'], ifc:['IFC main tower','IFC west wedge','IFC east wedge','IFC podium'],
    parc:['Parc1 tall','Parc1 short','Parc1 podium'],
    east:['Brown chamfered office','Banded midrise','East crown tower','Rear dark slab','Secondary 0','Secondary 1','Secondary 2','Secondary 3','Secondary 4','Secondary 5','Secondary 6','East podium']
}
for c in districts:
    landmark=bpy.data.objects.new(c.name+' GROUP',None); c.objects.link(landmark); landmark['landmark']=c.name
    roots={}
    for key in building_keys[c]:
        r=bpy.data.objects.new(key+' GROUP',None); c.objects.link(r); r.parent=landmark; r['building']=key; roots[key]=r
    for o in list(c.objects):
        if o.type != 'MESH': continue
        key=next((k for k in building_keys[c] if (k=='Park' or o.name.startswith(k))), building_keys[c][-1])
        o.parent=roots[key]

# Retain each individual building while joining its same-material components.
for c in districts:
    for root in [o for o in c.objects if o.type=='EMPTY' and 'building' in o]:
      for material in list(bpy.data.materials):
        objs=[o for o in c.objects if o.type=='MESH' and o.parent==root and len(o.data.materials) and o.data.materials[0]==material]
        if len(objs)>1:
            bpy.ops.object.select_all(action='DESELECT')
            for o in objs:
                o.select_set(True); bpy.context.view_layer.objects.active=o
                bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            bpy.context.view_layer.objects.active=objs[0]
            bpy.ops.object.join(); objs[0].name='Batched • '+root['building']+' • '+material.name

# exporter settings: no cameras/lights are authored, textureless PBR geometry remains compact.
bpy.context.scene['coordinate_note']='glTF: Blender -Y is viewer-facing +Z; ground Z=0; model width 1000, depth 500, tallest 341.'
bpy.context.scene['placement_note']='Place model around Three.js z=-950: front park local +Z maps to approx -700, city to -950..-1150.'
# The .blend opens usefully on its own.  These are deliberately not part of the GLB.
bpy.context.scene.world.color=(.065,.090,.155)
bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
bpy.context.scene.render.resolution_x=1600; bpy.context.scene.render.resolution_y=900; bpy.context.scene.render.resolution_percentage=60
bpy.context.scene.render.image_settings.file_format='PNG'
preview=collection('00 • Preview camera and studio lights (not GLB)')
bpy.ops.object.camera_add(location=(690,-1650,690))
cam=bpy.context.object; cam.name='Preview • oblique riverside camera'; link(cam,preview); bpy.context.scene.camera=cam
def look_at(o, target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
look_at(cam,(0,25,145)); cam.data.lens=38
cam.data.clip_end=5000
for name,loc,energy,size,color in [
    ('Preview • cool key',(-360,-430,620),42000,430,(.38,.58,1.0)),
    ('Preview • warm edge',(550,140,430),30000,360,(1.0,.30,.10)),
    ('Preview • soft fill',(0,-200,250),16000,500,(.30,.42,1.0))]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    lamp=bpy.context.object; lamp.name=name; lamp.data.energy=energy; lamp.data.shape='DISK'; lamp.data.size=size; lamp.data.color=color; link(lamp,preview); look_at(lamp,(-20,35,130))
bpy.context.preferences.filepaths.save_version=0
backup=OUT_BLEND+'1'
if os.path.exists(backup): os.remove(backup)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=False, export_cameras=False, export_lights=False, export_materials='EXPORT', export_yup=True, export_apply=True)
print('YEouido export complete', OUT_BLEND, OUT_GLB)
