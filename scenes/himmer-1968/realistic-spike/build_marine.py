# Builds a realistic US Marine rifleman (April 1968) for the three.js diorama, headless:
#   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P build_marine.py -- [key=value ...]
# Keys (all optional): seed, height (m), age, muscle, weight, caucasian, african, asian, skin, eyes, hair, brows,
#   name (output basename, default "marine"), hero_tris, lod_tris, tex (atlas size), blend (save .blend: 0/1).
# Needs the MPFB extension and the MakeHuman system asset pack (CC0) installed; see ASSETS.md.
# Output, next to this file: <name>.glb (hero, <=25k tris, 2 texture sets), <name>-lod.glb (6k tris),
# <name>-tpose.fbx (T-pose, mesh and kit without the rifle, for Mixamo).
import bpy, bmesh, sys, os, math, random, importlib, json, struct
import addon_utils
import numpy as np
from mathutils import Vector, Matrix, Euler, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.path.join(HERE, ".scratch")
os.makedirs(SCRATCH, exist_ok=True)

# ---------------------------------------------------------------- parameters
P = dict(seed=1968, height=1.78, age=27, muscle=0.72, weight=0.42, caucasian=0.85, african=0.05, asian=0.10,
         skin="young_caucasian_male/young_caucasian_male.mhmat", eyes="brown", hair="short04/short04.mhclo",
         brows="eyebrow001/eyebrow001.mhclo", name="marine", hero_tris=24000, lod_tris=6000, tex=2048, blend=1, invert=0)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for a in argv:
    k, v = a.split("=", 1)
    P[k] = type(P[k])(v) if k in P and not isinstance(P[k], str) else v
random.seed(P["seed"])
print("PARAMS", P)

MOD = "bl_ext.blender_org.mpfb"
addon_utils.enable(MOD, default_set=True)
HS = importlib.import_module(MOD + ".services.humanservice").HumanService
AS = importlib.import_module(MOD + ".services.assetservice").AssetService


def log(*a):
    print("BUILD", *a, flush=True)


def tris_of(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


# ---------------------------------------------------------------- 1. the man (MPFB2)
def age_param(years):  # MPFB: 0 -> 1 yr, 0.1875 -> 11, 0.5 -> 25, 1 -> 90
    return 0.5 + (years - 25) / 65 * 0.5 if years >= 25 else 0.1875 + (years - 11) / 14 * 0.3125


def make_human(height_param):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    info = HS._create_default_human_info_dict()
    info["phenotype"].update(gender=1.0, age=age_param(P["age"]), muscle=P["muscle"], weight=P["weight"],
                             height=height_param, proportions=0.5)
    info["phenotype"]["race"] = {"caucasian": P["caucasian"], "african": P["african"], "asian": P["asian"]}
    info["rig"] = "game_engine"
    info["eyes"] = "high-poly/high-poly.mhclo"
    info["eyebrows"] = P["brows"]
    info["eyelashes"] = "eyelashes01/eyelashes01.mhclo"
    info["hair"] = P["hair"]
    info["clothes"] = ["male_casualsuit02/male_casualsuit02.mhclo", "shoes03/shoes03.mhclo"]
    info["skin_mhmat"] = P["skin"]
    info["skin_material_type"] = "MAKESKIN"
    s = HS.get_default_deserialization_settings()
    s["subdiv_levels"] = 0
    body = HS.deserialize_from_dict(info, s)
    return body


def shaped_coords(o):
    """Vertex positions with the shape keys (MPFB targets) mixed in."""
    n = len(o.data.vertices)
    co = np.zeros(n * 3, dtype=np.float64)
    o.data.vertices.foreach_get("co", co)
    sk = o.data.shape_keys
    if sk:
        tmp = np.zeros(n * 3)
        ref = np.zeros(n * 3)
        for kb in sk.key_blocks[1:]:
            if kb.value == 0 or kb.mute:
                continue
            kb.data.foreach_get("co", tmp)
            kb.relative_key.data.foreach_get("co", ref)
            co += kb.value * (tmp - ref)
    return co.reshape(n, 3)


def top_of_head(body):
    g = body.vertex_groups["body"].index
    co = shaped_coords(body)
    idx = [v.index for v in body.data.vertices if any(e.group == g and e.weight > 0.5 for e in v.groups)]
    return float(co[idx, 2].max())


hp = 0.55
body = make_human(hp)
h = top_of_head(body)
log("first height", round(h, 3))
slope = 1.45  # metres per unit of the MPFB height slider near the default (measured); refined by secant steps
for _ in range(3):
    if abs(h - P["height"]) < 0.004:
        break
    hp2 = min(1.0, max(0.0, hp + (P["height"] - h) / slope))
    body = make_human(hp2)
    h2 = top_of_head(body)
    if abs(hp2 - hp) > 1e-4 and abs(h2 - h) > 1e-4:
        slope = (h2 - h) / (hp2 - hp)
    hp, h = hp2, h2
log("height", round(h, 3), "param", round(hp, 3))

rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
rig.name = "Marine.rig"
rig.data.name = "Marine.rig"
rig.data.pose_position = "REST"
parts = {}
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    n = o.name
    key = ("body" if n == "Human" else "eyes" if "high-poly" in n else "brows" if "eyebrow" in n else
           "lashes" if "eyelash" in n else "suit" if "casualsuit" in n else "boots" if "shoes" in n else "hair")
    parts[key] = o
    log("part", n, key, len(o.data.polygons))
    o.name = "src." + key
BONES = {b.name for b in rig.data.bones}


def bone_head(name):
    return rig.matrix_world @ rig.data.bones[name].head_local


def bone_tail(name):
    return rig.matrix_world @ rig.data.bones[name].tail_local


def dominant_bone(v, obj):
    best, bw = None, 0.0
    for e in v.groups:
        nm = obj.vertex_groups[e.group].name
        if nm in BONES and e.weight > bw:
            best, bw = nm, e.weight
    return best


FOREARM = {b for b in BONES if b.startswith(("lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb"))}

# ---------------------------------------------------------------- 2. clean the MPFB meshes
def apply_shape_keys(o):
    if o.data.shape_keys:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        o.select_set(False)


def delete_verts(o, pred):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    dv = [bm.verts[i] for i, v in enumerate(o.data.vertices) if pred(v)]
    bmesh.ops.delete(bm, geom=dv, context="VERTS")
    bm.to_mesh(o.data)
    bm.free()


def delete_faces(o, pred):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.faces.ensure_lookup_table()
    df = [f for f in bm.faces if pred(f)]
    bmesh.ops.delete(bm, geom=df, context="FACES")
    bm.to_mesh(o.data)
    bm.free()


for o in parts.values():
    apply_shape_keys(o)
    for m in list(o.modifiers):
        if m.type != "ARMATURE":
            o.modifiers.remove(m)

# jungle boots, from a last (not the foot mesh): one closed lofted shell per boot (toe box, instep, heel, a canvas shaft
# to mid-shin with a slight taper), a 2 cm sole with a straight bevelled edge, a tongue, eight pairs of eyelets and a lace
# zigzagging between them. Rigid on the foot bone below the ankle, on the calf above.
BOOT_H = 0.30
COLL_ = bpy.context.scene.collection
BOOT = {}


def boot_w(o, side, ank_z):
    o.vertex_groups.clear()
    gf, gc = o.vertex_groups.new(name="foot_" + side), o.vertex_groups.new(name="calf_" + side)
    for v in o.data.vertices:
        t = min(1.0, max(0.0, (v.co.z - (ank_z - 0.01)) / 0.06))
        gf.add([v.index], 1 - t, "REPLACE")
        gc.add([v.index], t, "REPLACE")
    o.parent = rig
    m = o.modifiers.new("Armature", "ARMATURE")
    m.object = rig


def loft(bm, rings, cap_bottom=False, cap_top=False):
    V = [[bm.verts.new(p_) for p_ in r] for r in rings]
    n = len(rings[0])
    for j in range(len(V) - 1):
        for i in range(n):
            bm.faces.new((V[j][i], V[j][(i + 1) % n], V[j + 1][(i + 1) % n], V[j + 1][i]))
    if cap_bottom:
        bm.faces.new(V[0][::-1])
    if cap_top:
        bm.faces.new(V[-1])
    return V


def boot_parts(side):
    ank = bone_head("foot_" + side)
    ball = bone_head("ball_" + side)
    calf = bone_head("calf_" + side)
    sx = 1 if side == "l" else -1
    heel_y, toe_y = ank.y + 0.07, ball.y - 0.08
    cx0 = ank.x * 0.6 + ball.x * 0.4
    NS = 28

    def section(z):
        """centre x, front y, back y, half width, toe-box bias, squareness at height z (rest coords, sole top at 0)"""
        if z <= 0.13:
            if z < 0.045:
                front = toe_y + 0.014 * (z / 0.045) ** 2
            else:
                k = (z - 0.045) / 0.085
                front = (toe_y + 0.014) * (1 - k ** 0.8) + (ank.y - 0.055) * k ** 0.8
            back = heel_y - 0.006 * (z / 0.13)
            hw = 0.052 - 0.004 * (z / 0.13)
            bias = 0.14 * (1 - z / 0.13)
            cx = cx0 * (1 - z / 0.13) + ank.x * (z / 0.13)
            return cx, front, back, hw, bias, 2.6
        t = (z - 0.13) / (BOOT_H - 0.13)
        sh = ank.lerp(calf, (z - ank.z) / (calf.z - ank.z))  # the shin line
        return sh.x, ank.y - 0.052 + 0.004 * t, ank.y + 0.058 + 0.012 * t, 0.049 + 0.006 * t, 0.0, 2.2

    def ring(z, grow=0.0):
        cx, front, back, hw, bias, ex = section(z)
        cy, by = (front + back) / 2, (back - front) / 2
        pts = []
        for i in range(NS):
            th = 2 * math.pi * i / NS
            c, s_ = math.cos(th), math.sin(th)
            ce, se = math.copysign(abs(c) ** (2 / ex), c), math.copysign(abs(s_) ** (2 / ex), s_)
            x = cx + (hw * (1 + bias * max(0.0, -s_)) + grow) * ce
            y = cy + (by + grow) * se
            pts.append(Vector((x, y, z)))
        return pts
    zs = [0.0, 0.01, 0.025, 0.045, 0.065, 0.085, 0.105, 0.13, 0.16, 0.195, 0.23, 0.265, BOOT_H]
    bm = bmesh.new()
    loft(bm, [ring(z) for z in zs], cap_bottom=True)
    # rolled top edge of the shaft
    top = ring(BOOT_H)
    cen = sum(top, Vector()) / NS
    bm2 = bmesh.new()
    shell = new_obj("kit.boot_" + side, bm)
    rim_pts = [p_ + (p_ - cen).normalized() * 0.002 for p_ in top]
    # sole: the outline at z=0 pushed out 5 mm, a 2 cm slab with chamfered edges, heel a touch deeper
    base = ring(0.0, 0.0)
    so = []
    for dz, g in ((0.0, 0.004), (-0.003, 0.007), (-0.017, 0.007), (-0.02, 0.0045)):
        so.append([Vector((p_.x, p_.y, dz)) + (Vector((p_.x - cx0, p_.y - (toe_y + heel_y) / 2, 0)).normalized() * g) for p_ in base])
    loft(bm2, so, cap_bottom=True, cap_top=True)
    sole = new_obj("kit.sole_" + side, bm2)
    # tongue and eyelets up the front, lace between them
    eye_pts = []
    for k in range(8):
        z = 0.075 + (BOOT_H - 0.095) * k / 7
        cx, front, back, hw, bias, ex = section(z)
        for d in (-1, 1):
            x = cx + d * 0.013
            eye_pts.append(Vector((x, front - 0.002 + 0.25 * (abs(d * 0.013) / hw) ** 2 * (back - front) * 0.1, z)))
    bm3 = bmesh.new()
    for p_ in eye_pts:
        r = bmesh.ops.create_cone(bm3, cap_ends=True, segments=6, radius1=0.0035, radius2=0.0035, depth=0.003)
        M = Matrix.Translation(p_) @ Matrix.Rotation(math.radians(90), 4, "X")
        for v in r["verts"]:
            v.co = M @ v.co
    eyelets = new_obj("kit.eyelets_" + side, bm3)
    lace = []
    for k in range(8):
        a_, b_ = eye_pts[2 * k], eye_pts[2 * k + 1]
        if k % 2:
            a_, b_ = b_, a_
        lace += [a_ + Vector((0, -0.0025, 0)), b_ + Vector((0, -0.0025, 0))]
    lace_o = new_obj("kit.lace_" + side, tube(lace, 0.0017, 5, False))
    bm4 = bmesh.new()
    rows = []
    for k in range(10):
        z = 0.07 + (BOOT_H - 0.075) * k / 9
        cx, front, back, hw, bias, ex = section(z)
        rows.append([Vector((cx - 0.011, front - 0.0012, z)), Vector((cx + 0.011, front - 0.0012, z))])
    V = [[bm4.verts.new(p_) for p_ in r] for r in rows]
    for j in range(len(V) - 1):
        bm4.faces.new((V[j][0], V[j][1], V[j + 1][1], V[j + 1][0]))
    tongue = new_obj("kit.tongue_" + side, bm4)
    rim = new_obj("kit.bootrim_" + side, tube(rim_pts, 0.0035, 6, True))
    for o in (shell, sole, eyelets, lace_o, tongue, rim):
        boot_w(o, side, ank.z)
    BOOT[side] = dict(shell=shell, sole=sole, eyelets=eyelets, lace=lace_o, tongue=tongue, rim=rim,
                      toe_y=toe_y, heel_y=heel_y, ank=ank.copy(), top_r=((top[0] - cen).length + (top[NS // 4] - cen).length) / 2)
    return shell


def tube(points, radius, seg=8, closed=False, taper=0.0):
    """A smooth tube along points; radius may be a function of t in [0,1]; taper rounds the open ends."""
    bm = bmesh.new()
    n = len(points)
    rings = []
    for i, p_ in enumerate(points):
        a = points[(i - 1) % n] if (closed or i > 0) else p_
        b_ = points[(i + 1) % n] if (closed or i < n - 1) else p_
        d = (b_ - a).normalized()
        x1 = d.cross(Vector((0, 0, 1)))
        if x1.length < 1e-4:
            x1 = d.cross(Vector((1, 0, 0)))
        x1.normalize()
        y1 = x1.cross(d)
        t = i / (n - 1) if n > 1 else 0
        r = radius(t) if callable(radius) else radius
        if taper and not closed:
            r *= min(1.0, 0.35 + 0.65 * min(t, 1 - t) / taper)
        rings.append([bm.verts.new(p_ + (x1 * math.cos(2 * math.pi * k / seg) + y1 * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(n if closed else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(seg):
            bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    if not closed:
        for R_, rev in ((rings[0], True), (rings[-1], False)):
            c = bm.verts.new(sum((v.co for v in R_), Vector()) / seg)
            for k in range(seg):
                f = (R_[k], R_[(k + 1) % seg], c)
                bm.faces.new(f[::-1] if rev else f)
    return bm


def new_obj(name, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    COLL_.objects.link(o)
    return o


boot_parts("l")
boot_parts("r")
bpy.data.objects.remove(parts["boots"])
parts["boots"] = BOOT["l"]["shell"]
for side in "lr":
    for k in ("sole", "eyelets", "lace", "tongue", "rim"):
        parts["boot_" + k + "_" + side] = BOOT[side][k]
parts["boot_shell_r"] = BOOT["r"]["shell"]
bpy.data.objects.remove(parts.pop("hair"))  # cropped hair is painted on the scalp (no alpha cards)

# boots: rigid on the foot bone (no toe-bone bend: a jungle boot sole does not curl), and the sole on the ground
bo = parts["boots"]
for side in "lr":
    gb, gf = bo.vertex_groups.get("ball_" + side), bo.vertex_groups.get("foot_" + side)
    if gb is None:
        continue
    if gf is None:
        gf = bo.vertex_groups.new(name="foot_" + side)
    for v in bo.data.vertices:
        w = next((e.weight for e in v.groups if e.group == gb.index), 0.0)
        if w > 0:
            wf = next((e.weight for e in v.groups if e.group == gf.index), 0.0)
            gf.add([v.index], wf + w, "REPLACE")
    bo.vertex_groups.remove(gb)
SOLE = -min(v.co.z for k_, o_ in parts.items() if k_.startswith("boot") for v in o_.data.vertices)
if SOLE > 0.001:  # MPFB stands the bare feet on z=0; the boot soles hang below, so lift the whole figure
    for o in parts.values():
        o.data.transform(Matrix.Translation((0, 0, SOLE)))
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for eb in rig.data.edit_bones:
        eb.head.z += SOLE
        eb.tail.z += SOLE
    bpy.ops.object.mode_set(mode="OBJECT")
log("boot sole lift", round(SOLE, 4))

b = parts["body"]
gi = {g.name: g.index for g in b.vertex_groups}


def wt(v, name):
    i = gi.get(name)
    for e in v.groups:
        if e.group == i:
            return e.weight
    return 0.0


def body_hidden(v):
    if wt(v, "body") < 0.5:
        return True  # helper geometry
    if v.co.z < 0.32:  # feet, ankles, shins: inside boots and trousers
        return True
    if abs(v.co.x) > 0.2 and dominant_bone(v, b) in ARMB:
        side = "l" if v.co.x > 0 else "r"
        if sleeve_t(v.co, side) > -0.20:
            return False  # bare from just above the elbow (sleeves rolled above it)
    if wt(v, "Delete.male_casualsuit02") > 0.5 and dominant_bone(v, b) not in FOREARM:
        return True
    return False


ARMB = {b_ for b_ in BONES if b_.startswith(("upperarm", "lowerarm", "hand"))}
elbow = {side: bone_head("lowerarm_" + side) for side in "lr"}
hand_h = {side: bone_head("hand_" + side) for side in "lr"}


def sleeve_t(co, side):  # 0 at elbow, 1 at wrist, negative up the upper arm
    a, c = elbow[side], hand_h[side]
    d = c - a
    return (co - a).dot(d) / d.length_squared


_co = shaped_coords(b)
MOUTH = Vector(_co[[v.index for v in b.data.vertices if wt(v, "joint-mouth") > 0.5]].mean(axis=0))
log("mouth", tuple(round(x, 3) for x in MOUTH))
delete_verts(b, body_hidden)

# rolled sleeves: the shirt ends a few cm above the elbow (as in the photographs); a soft double roll covers the cut
s = parts["suit"]
neck_z = bone_head("neck_01").z
SLEEVE_CUT = -0.16


def in_forearm(co):
    side = "l" if co.x > 0 else "r"
    return co.z > 0.9 and abs(co.x) > 0.2 and sleeve_t(co, side) > SLEEVE_CUT


CUFF_Z = BOOT_H + SOLE + 0.03
delete_verts(s, lambda v: (in_forearm(v.co) and dominant_bone(v, s) in ARMB) or v.co.z < CUFF_Z)
CUFFS = []
for side in "lr":
    a_, c_ = bone_head("calf_" + side), bone_head("foot_" + side)

    def axis_at(z):
        return a_.lerp(c_, (a_.z - z) / (a_.z - c_.z))
    ring_v = [v.co for v in s.data.vertices if (v.co.x > 0) == (side == "l") and v.co.z < CUFF_Z + 0.03]
    ap = axis_at(CUFF_Z)
    r_t = (sum(Vector((q.x - ap.x, q.y - ap.y)).length for q in ring_v) / len(ring_v)) if ring_v else 0.075
    br = BOOT[side]["top_r"]
    top = BOOT_H + SOLE
    rows = []
    for z, rr, fold in ((CUFF_Z + 0.004, r_t, 0.0), (top + 0.018, max(r_t, br + 0.02), 0.005), (top + 0.004, br + 0.019, 0.006),
                        (top - 0.012, br + 0.011, 0.004), (top - 0.02, br + 0.006, 0.0)):
        cen = axis_at(z)
        rows.append([Vector((cen.x + math.cos(2 * math.pi * i / 32) * (rr + fold * math.sin(7 * 2 * math.pi * i / 32 + 0.7 * len(rows))),
                             cen.y + math.sin(2 * math.pi * i / 32) * (rr + fold * math.sin(7 * 2 * math.pi * i / 32 + 0.7 * len(rows))), z)) for i in range(32)])
    bm = bmesh.new()
    V = [[bm.verts.new(p_) for p_ in r] for r in rows]
    for j in range(len(V) - 1):
        for i in range(32):
            bm.faces.new((V[j][i], V[j][(i + 1) % 32], V[j + 1][(i + 1) % 32], V[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("kit.cuff_trouser_" + side)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("kit.cuff_trouser_" + side, me)
    COLL_.objects.link(o)
    o.parent = rig
    g = o.vertex_groups.new(name="calf_" + side)
    g.add(range(len(me.vertices)), 1.0, "REPLACE")
    m = o.modifiers.new("Armature", "ARMATURE")
    m.object = rig
    CUFFS.append(o)
log("trouser cuffs", [round(BOOT[s_]["top_r"], 3) for s_ in "lr"])
for o in parts.values():
    for g in list(o.vertex_groups):
        if g.name not in BONES:
            o.vertex_groups.remove(g)
for key_ in ("eyes",):
    o = parts[key_]
    o.vertex_groups.clear()
    g = o.vertex_groups.new(name="head")
    g.add(range(len(o.data.vertices)), 1.0, "REPLACE")
log("cleaned", {k: tris_of(o) for k, o in parts.items()})

# ---------------------------------------------------------------- 3. materials (Principled, baked to atlases later)
TEXROOT = os.path.join(os.path.expanduser("~/Library/Application Support/Blender/5.2/extensions/.user/blender_org/mpfb/data"))


def mhmat_textures(path):
    out = {}
    d = os.path.dirname(path)
    for line in open(path):
        parts_ = line.split()
        if len(parts_) == 2 and parts_[0] in ("diffuseTexture", "normalmapTexture", "aomapTexture", "bumpmapTexture"):
            out[parts_[0]] = os.path.join(d, os.path.basename(parts_[1]))
    return out


def asset_dir(sub, fragment):
    return os.path.join(TEXROOT, sub, os.path.dirname(fragment))


class NB:  # small node-building helper
    def __init__(self, name):
        self.m = bpy.data.materials.new(name)
        self.m.use_nodes = True
        self.t = self.m.node_tree
        self.t.nodes.clear()
        self.out = self.t.nodes.new("ShaderNodeOutputMaterial")
        self.bsdf = self.t.nodes.new("ShaderNodeBsdfPrincipled")
        self.t.links.new(self.bsdf.outputs[0], self.out.inputs[0])
        self.sock = {}
        self.uv = None

    def n(self, typ, **kw):
        node = self.t.nodes.new(typ)
        for k, v in kw.items():
            setattr(node, k, v)
        return node

    def L(self, a, b):
        self.t.links.new(a, b)

    def val(self, x):
        node = self.n("ShaderNodeValue")
        node.outputs[0].default_value = x
        return node.outputs[0]

    def rgb(self, hexc):
        node = self.n("ShaderNodeRGB")
        c = srgb_to_lin(hexc)
        node.outputs[0].default_value = (*c, 1)
        return node.outputs[0]

    def img(self, path, data=False):
        if self.uv is None:
            self.uv = self.n("ShaderNodeUVMap", uv_map="UVMap")
        im = bpy.data.images.load(path, check_existing=True)
        if data:
            im.colorspace_settings.name = "Non-Color"
        node = self.n("ShaderNodeTexImage", image=im)
        self.L(self.uv.outputs[0], node.inputs[0])
        return node

    def math(self, op, a, b=None, clamp=False):
        node = self.n("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                node.inputs[i].default_value = x
            else:
                self.L(x, node.inputs[i])
        return node.outputs[0]

    def mix(self, fac, a, b, blend="MIX"):
        node = self.n("ShaderNodeMix", data_type="RGBA", blend_type=blend)
        for j, (sock, x) in enumerate(((node.inputs[0], fac), (node.inputs[6], a), (node.inputs[7], b))):
            if isinstance(x, (int, float)) and j > 0:
                sock.default_value = (x, x, x, 1)
            elif isinstance(x, (int, float)):
                sock.default_value = x
            elif isinstance(x, tuple):
                sock.default_value = x
            else:
                self.L(x, sock)
        return node.outputs[2]

    def xyz(self):
        tc = self.n("ShaderNodeTexCoord")
        sep = self.n("ShaderNodeSeparateXYZ")
        self.L(tc.outputs["Object"], sep.inputs[0])
        return tc.outputs["Object"], sep.outputs

    def bump(self, height, strength=0.3, normal=None, dist=0.002):
        node = self.n("ShaderNodeBump")
        node.inputs["Strength"].default_value = strength
        node.inputs["Distance"].default_value = dist
        self.L(height, node.inputs["Height"])
        if normal is not None:
            self.L(normal, node.inputs["Normal"])
        return node.outputs[0]

    def noise(self, vec, scale, detail=4.0, rough=0.55):
        node = self.n("ShaderNodeTexNoise")
        node.inputs["Scale"].default_value = scale
        node.inputs["Detail"].default_value = detail
        node.inputs["Roughness"].default_value = rough
        self.L(vec, node.inputs["Vector"])
        return node

    def finish(self, base, rough, metal=0.0, alpha=1.0, normal=None):
        def sk(x):
            return self.val(x) if isinstance(x, (int, float)) else x
        self.sock = dict(base=base, rough=sk(rough), metal=sk(metal), alpha=sk(alpha), normal=normal)
        self.L(base, self.bsdf.inputs["Base Color"])
        self.L(self.sock["rough"], self.bsdf.inputs["Roughness"])
        self.L(self.sock["metal"], self.bsdf.inputs["Metallic"])
        self.L(self.sock["alpha"], self.bsdf.inputs["Alpha"])
        if normal is not None:
            self.L(normal, self.bsdf.inputs["Normal"])
        self.m["nb_set"] = 0
        return self


def srgb_to_lin(hexc):
    c = [((hexc >> 16) & 255) / 255, ((hexc >> 8) & 255) / 255, (hexc & 255) / 255]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def normal_map(nb, path, strength=1.0):
    t = nb.img(path, data=True)
    nm = nb.n("ShaderNodeNormalMap", uv_map="UVMap")
    nm.inputs["Strength"].default_value = strength
    nb.L(t.outputs[0], nm.inputs["Color"])
    return nm.outputs[0]


MATS = {}  # material name -> (NB, set index 0 skin / 1 kit)


def register(nb, setidx):
    MATS[nb.m.name] = (nb, setidx)
    return nb.m


def assign(o, mat):
    o.data.materials.clear()
    o.data.materials.append(mat)


# skin: MakeHuman diffuse, sun-tanned and a little dirty, pore-scale bump, oilier T-zone
skin_tex = mhmat_textures(os.path.join(TEXROOT, "skins", P["skin"]))["diffuseTexture"]
nb = NB("M.skin")
co, xyz = nb.xyz()
d = nb.img(skin_tex)
tan = nb.mix(1.0, d.outputs[0], (0.86, 0.70, 0.56, 1), "MULTIPLY")
dirt_n = nb.noise(co, 9.0, 6, 0.6)
dirt = nb.math("MULTIPLY", nb.math("SUBTRACT", dirt_n.outputs[0], 0.48, clamp=True), 1.6, clamp=True)
skin_c = nb.mix(dirt, tan, (0.32, 0.25, 0.17, 1), "MULTIPLY")
# stubble shadow on the jaw and upper lip (head below the nose, in front of the ears)
headc = bone_head("head")
zrel = nb.math("SUBTRACT", xyz[2], headc.z)
jaw = nb.math("MULTIPLY", nb.math("MULTIPLY", nb.math("SUBTRACT", 0.03, zrel), 30.0, clamp=True),
              nb.math("MULTIPLY", nb.math("ADD", zrel, 0.075), 50.0, clamp=True))  # soft edges, no seam
front = nb.math("MULTIPLY", nb.math("SUBTRACT", headc.y - 0.03, xyz[1]), 60.0, clamp=True)
stub_n = nb.noise(co, 900.0, 2, 0.5)
stub = nb.math("MULTIPLY", nb.math("MULTIPLY", jaw, front), nb.math("MULTIPLY", stub_n.outputs[0], 0.55))
skin_c = nb.mix(stub, skin_c, (0.18, 0.14, 0.11, 1))
# high-and-tight crop painted on the scalp: dark on the crown, scalp tone showing through on the clipped sides and
# nape, a soft hairline (no alpha cards, nothing for the ear to poke through)
fy = nb.math("SUBTRACT", xyz[1], headc.y)          # + towards the back of the head
ax_h = nb.math("ABSOLUTE", nb.math("SUBTRACT", xyz[0], headc.x))
hairline = nb.math("ADD", 0.06, nb.math("MULTIPLY", fy, -0.9))  # forehead line high at the front, lower behind
crown = nb.math("MULTIPLY", nb.math("SUBTRACT", zrel, hairline), 70.0, clamp=True)
nape = nb.math("MULTIPLY", nb.math("MULTIPLY", nb.math("ADD", zrel, 0.02), 45.0, clamp=True),
               nb.math("MULTIPLY", nb.math("SUBTRACT", fy, 0.02), 40.0, clamp=True))
ear = nb.math("MULTIPLY", nb.math("MULTIPLY", nb.math("SUBTRACT", ax_h, 0.066), 80.0, clamp=True),
              nb.math("MULTIPLY", nb.math("SUBTRACT", 0.075, zrel), 60.0, clamp=True))
hair_amt = nb.math("MULTIPLY", nb.math("MAXIMUM", crown, nape), nb.math("SUBTRACT", 1.0, ear))
sides = nb.math("MULTIPLY", nb.math("SUBTRACT", ax_h, 0.045), 30.0, clamp=True)
dens = nb.math("SUBTRACT", 0.92, nb.math("MULTIPLY", sides, 0.4))  # clipped sides: thinner
hn = nb.noise(co, 1800.0, 2, 0.6)
hair_amt = nb.math("MULTIPLY", hair_amt, nb.math("MULTIPLY", dens, nb.math("ADD", 0.8, nb.math("MULTIPLY", hn.outputs[0], 0.3))), clamp=True)
skin_c = nb.mix(hair_amt, skin_c, (0.035, 0.026, 0.02, 1))
pores = nb.noise(co, 1400.0, 3, 0.7)
wr = nb.noise(co, 160.0, 4, 0.6)
hgt = nb.math("ADD", nb.math("MULTIPLY", pores.outputs[0], 0.6), nb.math("MULTIPLY", wr.outputs[0], 0.4))
n_skin = nb.bump(hgt, 0.22, dist=0.0006)
rough = nb.math("ADD", 0.48, nb.math("MULTIPLY", nb.math("SUBTRACT", wr.outputs[0], 0.5), 0.25))
assign(parts["body"], register(nb.finish(skin_c, rough, 0.0, 1.0, n_skin), 0))

# eyes
nb = NB("M.eyes")
e = nb.img(os.path.join(TEXROOT, "eyes", "materials", P["eyes"] + "_eye.png"))
assign(parts["eyes"], register(nb.finish(e.outputs[0], 0.08, 0.0, e.outputs["Alpha"]), 0))  # the cornea shell is transparent

# hair, brows, lashes: their own alpha cards, darkened to a dark brown
for key, frag, sub, tint in (("brows", P["brows"], "eyebrows", 0x2c2018),
                             ("lashes", "eyelashes01/eyelashes01.mhclo", "eyelashes", 0x1a1410)):
    mh = [f for f in os.listdir(asset_dir(sub, frag)) if f.endswith(".mhmat")][0]
    tx = mhmat_textures(os.path.join(asset_dir(sub, frag), mh))
    nb = NB("M." + key)
    t = nb.img(tx["diffuseTexture"])
    c = nb.mix(0.85, t.outputs[0], nb.rgb(tint), "MULTIPLY")
    assign(parts[key], register(nb.finish(c, 0.55, 0.0, t.outputs["Alpha"]), 0))

# OG-107 utilities: the suit's own folds (normal + AO) under faded OG green sateen
stx = mhmat_textures(os.path.join(TEXROOT, "clothes", "male_casualsuit02", "male_casualsuit02.mhmat"))
log("suit textures", stx)


def og107(name, ao=True, boots_on_legs=False):
    nb = NB(name)
    co, xyz = nb.xyz()
    base = nb.rgb(0x5d6140)
    var = nb.noise(co, 6.0, 3, 0.5)
    c = nb.mix(nb.math("MULTIPLY", nb.math("SUBTRACT", var.outputs[0], 0.5), 0.6), base, (0.30, 0.31, 0.20, 1))
    weave = nb.noise(co, 2600.0, 1, 0.5)
    nrm = None
    if ao and "aomapTexture" in stx:
        a = nb.img(stx["aomapTexture"], data=True)
        c = nb.mix(0.85, c, a.outputs[0], "MULTIPLY")
        d = nb.img(stx["diffuseTexture"])
        bw = nb.n("ShaderNodeRGBToBW")
        nb.L(d.outputs[0], bw.inputs[0])
        c = nb.mix(0.35, c, nb.mix(1.0, c, bw.outputs[0], "OVERLAY"))
        nrm = normal_map(nb, stx["normalmapTexture"], 1.0)
    if boots_on_legs:
        up = nb.math("LESS_THAN", xyz[2], 0.258)
        lo = nb.math("LESS_THAN", xyz[2], 0.135)
        canvas_c = nb.mix(nb.math("MULTIPLY", weave.outputs[0], 0.4), nb.rgb(0x3e4229), nb.rgb(0x585c3a))
        eyelet = nb.math("MULTIPLY", nb.math("GREATER_THAN", nb.n("ShaderNodeMath", operation="SINE").outputs[0], 0.75),
                         nb.math("LESS_THAN", nb.math("ABSOLUTE", nb.math("SUBTRACT", nb.math("FRACT", nb.math("MULTIPLY", xyz[0], 40.0)), 0.5)), 0.14))
        sn = eyelet.node.inputs[0].links[0].from_node.inputs[0].links[0].from_node
        nb.L(nb.math("MULTIPLY", xyz[2], 2 * math.pi / 0.021), sn.inputs[0])
        canvas_c = nb.mix(nb.math("MULTIPLY", eyelet, nb.math("LESS_THAN", xyz[1], -0.02)), canvas_c, nb.rgb(0x1a1a16))
        c = nb.mix(up, c, canvas_c)
        c = nb.mix(lo, c, nb.rgb(0x151311))
    sweat = nb.noise(co, 3.0, 2, 0.4)
    c = nb.mix(nb.math("MULTIPLY", nb.math("SUBTRACT", sweat.outputs[0], 0.55, clamp=True), 1.5), c, (0.20, 0.21, 0.13, 1))
    n = nb.bump(weave.outputs[0], 0.12, normal=nrm, dist=0.0005)
    return nb.finish(c, 0.86, 0.0, 1.0, n)


assign(parts["suit"], register(og107("M.utilities"), 1))
for o in CUFFS:
    assign(o, parts["suit"].data.materials[0])

def flat_mat(name, hexc, rough, metal=0.0, bump_scale=0.0, bump_str=0.15, noise_amt=0.15):
    nb = NB(name)
    co, xyz = nb.xyz()
    n = nb.noise(co, 40.0, 3)
    c = nb.mix(nb.math("MULTIPLY", nb.math("SUBTRACT", n.outputs[0], 0.5), noise_amt * 2), nb.rgb(hexc), (0, 0, 0, 1))
    nrm = nb.bump(nb.noise(co, bump_scale, 2).outputs[0], bump_str, dist=0.0005) if bump_scale else None
    return register(nb.finish(c, rough, metal, 1.0, nrm), 1)


# jungle boots, after the mannequin photograph: black leather toe cap, heel counter and lower; OD canvas upper
nb = NB("M.boots")
co, xyz = nb.xyz()
TOE_Y, HEEL_Y = BOOT["l"]["toe_y"], BOOT["l"]["heel_y"]
toe = nb.math("MULTIPLY", nb.math("SUBTRACT", TOE_Y + 0.075, xyz[1]), 300.0, clamp=True)
heel = nb.math("MULTIPLY", nb.math("SUBTRACT", xyz[1], HEEL_Y - 0.045), 300.0, clamp=True)
low = nb.math("MULTIPLY", nb.math("SUBTRACT", SOLE + 0.05, xyz[2]), 300.0, clamp=True)
leather = nb.math("MAXIMUM", low, nb.math("MAXIMUM", nb.math("MULTIPLY", toe, nb.math("LESS_THAN", xyz[2], SOLE + 0.075)),
                                              nb.math("MULTIPLY", heel, nb.math("LESS_THAN", xyz[2], SOLE + 0.115))))
canvas_c = nb.mix(nb.math("MULTIPLY", nb.noise(co, 900.0, 2).outputs[0], 0.4), nb.rgb(0x434a2c), nb.rgb(0x5d6440))
c = nb.mix(leather, canvas_c, nb.rgb(0x151413))
mud = nb.math("MULTIPLY", nb.math("LESS_THAN", xyz[2], SOLE + 0.035), nb.math("SUBTRACT", nb.noise(co, 30.0, 3).outputs[0], 0.5, clamp=True))
c = nb.mix(nb.math("MULTIPLY", mud, 0.7), c, nb.rgb(0x6b5236))
r = nb.mix(leather, 0.9, 0.38)
boot_mat = register(nb.finish(c, nb.math("ADD", r, 0.0), 0.0, 1.0, nb.bump(nb.noise(co, 700.0, 2).outputs[0], 0.2, dist=0.001)), 1)
sole_mat = flat_mat("M.sole", 0x0d0d0c, 0.85, 0, 400, 0.3, 0.05)
eyelet_mat = flat_mat("M.eyelet", 0x2a2820, 0.45, 0.7, 0, 0, 0.05)
lace_mat = flat_mat("M.lace", 0x1e1d18, 0.8, 0, 0, 0, 0.05)
for side in "lr":
    assign(BOOT[side]["shell"], boot_mat)
    assign(BOOT[side]["rim"], boot_mat)
    assign(BOOT[side]["tongue"], boot_mat)
    assign(BOOT[side]["sole"], sole_mat)
    assign(BOOT[side]["eyelets"], eyelet_mat)
    assign(BOOT[side]["lace"], lace_mat)


# ---------------------------------------------------------------- 4. kit
COLL = bpy.context.scene.collection


def new_obj(name, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    COLL.objects.link(o)
    return o


def rigid_skin(o, bone, w2=None):
    o.parent = rig
    o.vertex_groups.clear()
    g = o.vertex_groups.new(name=bone)
    g.add(range(len(o.data.vertices)), 1.0, "REPLACE")
    if w2:
        g2 = o.vertex_groups.new(name=w2[0])
        g.add(range(len(o.data.vertices)), 1 - w2[1], "REPLACE")
        g2.add(range(len(o.data.vertices)), w2[1], "REPLACE")
    m = o.modifiers.new("Armature", "ARMATURE")
    m.object = rig


def smart_uv(o):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    if not o.data.uv_layers:
        o.data.uv_layers.new(name="UVMap")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.01)
    bpy.ops.object.mode_set(mode="OBJECT")
    o.select_set(False)


def copy_faces(src, pred, name):
    bm = bmesh.new()
    bm.from_mesh(src.data)
    bm.faces.ensure_lookup_table()
    keep = set(f.index for f in bm.faces if pred(f))
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    COLL.objects.link(o)
    o.parent = rig
    for g in src.vertex_groups:
        o.vertex_groups.new(name=g.name)
    # vertex group weights are carried in the mesh deform layer, so they survive the copy
    m = o.modifiers.new("Armature", "ARMATURE")
    m.object = rig
    return o


sv = s.data.vertices


def face_dom(f, obj):
    cnt = {}
    for v in f.verts:
        db = dominant_bone(obj.data.vertices[v.index], obj)
        cnt[db] = cnt.get(db, 0) + 1
    return max(cnt, key=cnt.get)


belt_z = bone_head("pelvis").z + 0.035
chest_top = bone_head("neck_01").z - 0.02
ARM = {b_ for b_ in BONES if b_.startswith(("upperarm", "lowerarm", "hand"))}

def rounded_box(size, bevel=0.012, segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segs, affect="EDGES", profile=0.5)
    return bm


# 4a. USMC M1955 body armour, after the photographs: a flat-faced nylon vest about 2 cm thick, built as one closed
# shell (rings around the torso from the hem at the trouser waistband to the shoulders, then a yoke that follows the
# shoulders to a neck ring). Clean edges: piped hem, taped armholes, a short padded collar roll, two low rope pads per
# shoulder, two big flapped cargo pockets low on the front, a zip under a snapped storm flap (stitching in the texture).
from mathutils.bvhtree import BVHTree
dg = bpy.context.evaluated_depsgraph_get()
BVH = [BVHTree.FromObject(o, dg) for o in (parts["suit"], parts["body"])]


def surface_z(x, y, top=2.6):
    best = None
    for t in BVH:
        hit = t.ray_cast(Vector((x, y, top)), Vector((0, 0, -1)))
        if hit[0] is not None and (best is None or hit[0].z > best):
            best = hit[0].z
    return best


def tube(points, radius, seg=8, closed=False, taper=0.0):
    """A smooth tube along points; radius may be a function of t in [0,1]; taper rounds the open ends."""
    bm = bmesh.new()
    n = len(points)
    rings = []
    for i, p_ in enumerate(points):
        a = points[(i - 1) % n] if (closed or i > 0) else p_
        b_ = points[(i + 1) % n] if (closed or i < n - 1) else p_
        d = (b_ - a).normalized()
        x1 = d.cross(Vector((0, 0, 1)))
        if x1.length < 1e-4:
            x1 = d.cross(Vector((1, 0, 0)))
        x1.normalize()
        y1 = x1.cross(d)
        t = i / (n - 1) if n > 1 else 0
        r = radius(t) if callable(radius) else radius
        if taper and not closed:
            r *= min(1.0, 0.35 + 0.65 * min(t, 1 - t) / taper)
        rings.append([bm.verts.new(p_ + (x1 * math.cos(2 * math.pi * k / seg) + y1 * math.sin(2 * math.pi * k / seg)) * r) for k in range(seg)])
    for i in range(n if closed else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(seg):
            bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    if not closed:
        for R_, rev in ((rings[0], True), (rings[-1], False)):
            c = bm.verts.new(sum((v.co for v in R_), Vector()) / seg)
            for k in range(seg):
                f = (R_[k], R_[(k + 1) % seg], c)
                bm.faces.new(f[::-1] if rev else f)
    return bm


TORSO_CHAIN = ["pelvis", "spine_01", "spine_02", "spine_03", "neck_01"]
CHAIN_Z = [bone_head(n).z for n in TORSO_CHAIN]


def torso_weights(o, collar=False):
    """Weights by height along the spine; the yoke shares the clavicles; nothing on the arms (stays put when they swing)."""
    o.vertex_groups.clear()
    gs = {n: o.vertex_groups.new(name=n) for n in TORSO_CHAIN + ["clavicle_l", "clavicle_r"]}
    for v in o.data.vertices:
        z = v.co.z
        w = {}
        if z <= CHAIN_Z[0]:
            w["pelvis"] = 1.0
        elif z >= CHAIN_Z[3]:
            w["spine_03"] = 1.0
        else:
            for i in range(3):
                if CHAIN_Z[i] <= z <= CHAIN_Z[i + 1]:
                    t = (z - CHAIN_Z[i]) / (CHAIN_Z[i + 1] - CHAIN_Z[i])
                    w[TORSO_CHAIN[i]], w[TORSO_CHAIN[i + 1]] = 1 - t, t
        if z > CHAIN_Z[3] - 0.04 and abs(v.co.x) > 0.09:
            k = min(1.0, (abs(v.co.x) - 0.09) / 0.12) * 0.6
            cl = "clavicle_l" if v.co.x > 0 else "clavicle_r"
            w = {n: x * (1 - k) for n, x in w.items()}
            w[cl] = w.get(cl, 0) + k
        if collar:
            w = {n: x * 0.7 for n, x in w.items()}
            w["neck_01"] = w.get("neck_01", 0) + 0.3
        for n, x in w.items():
            gs[n].add([v.index], x, "REPLACE")
    o.parent = rig
    m = o.modifiers.new("Armature", "ARMATURE")
    m.object = rig


def smooth(o):
    for p_ in o.data.polygons:
        p_.use_smooth = True


hem_z = belt_z - 0.012
sh_l = bone_head("upperarm_l")
yoke_z = sh_l.z - 0.035
armpit_z = sh_l.z - 0.13
neck = bone_head("neck_01")
NA = 64
tv = [(v.co.copy(), dominant_bone(v, o)) for o in (s, parts["body"]) for v in o.data.vertices]
torso_pts = [c for c, db in tv if db not in ARM and db not in ("head", "neck_01") and abs(c.x) < 0.24]
levels = []
z = hem_z
while z < yoke_z - 1e-4:
    levels.append(z)
    z += 0.022
levels.append(yoke_z)
VEST_OFF = 0.016


def hull2d(pts):
    pts = sorted(set((round(x, 4), round(y, 4)) for x, y in pts))

    def cross(o_, a, b_):
        return (a[0] - o_[0]) * (b_[1] - o_[1]) - (a[1] - o_[1]) * (b_[0] - o_[0])
    lo, up = [], []
    for p_ in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p_) <= 0:
            lo.pop()
        lo.append(p_)
    for p_ in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p_) <= 0:
            up.pop()
        up.append(p_)
    h = lo[:-1] + up[:-1]
    return h, (sum(q[0] for q in h) / len(h), sum(q[1] for q in h) / len(h))


def ray_hull(hull, cen, ang):
    d = Vector((math.sin(ang), -math.cos(ang)))
    best = None
    for i in range(len(hull)):
        a = Vector(hull[i]) - Vector(cen)
        b_ = Vector(hull[(i + 1) % len(hull)]) - Vector(cen)
        e = b_ - a
        den = d.x * (-e.y) - d.y * (-e.x)
        if abs(den) < 1e-9:
            continue
        t = (a.x * (-e.y) - a.y * (-e.x)) / den
        u = (d.x * a.y - d.y * a.x) / den
        if t > 0 and -1e-6 <= u <= 1 + 1e-6:
            best = t if best is None else min(best, t)
    return Vector(cen) + d * best


grid = []
log("torso pts", len(torso_pts), "levels", round(levels[0], 3), round(levels[-1], 3))
for z in levels:
    band = 0.016
    pts = [(p_.x, p_.y) for p_ in torso_pts if abs(p_.z - z) < band]
    while len(set(pts)) < 8 and band < 0.08:
        band *= 1.6
        pts = [(p_.x, p_.y) for p_ in torso_pts if abs(p_.z - z) < band]
    hull, cen = hull2d(pts)
    row = []
    for i in range(NA):
        ang = 2 * math.pi * i / NA
        p_ = ray_hull(hull, cen, ang)
        dirv = (p_ - Vector(cen)).normalized()
        side = abs(math.sin(ang))
        off = VEST_OFF
        if z > armpit_z and side > 0.6:  # under the arm the vest is cut away: hug the torso, the arm covers it
            off = VEST_OFF * (1 - (side - 0.6) / 0.4 * 0.8)
        q = p_ + dirv * off
        row.append(Vector((q.x, q.y, z)))
    grid.append(row)
# flat faces: the front and back hang as planes from the chest and the shoulder blades (no bust, no belly)
YF = min(v.y for r in grid for v in r)
YB = max(v.y for r in grid for v in r)
for r in grid:
    for i, v in enumerate(r):
        c_ = math.cos(2 * math.pi * i / NA)
        k = min(1.0, max(0.0, abs(c_) - 0.25) / 0.6)
        v.y = v.y + ((YF + 0.004 if c_ > 0 else YB - 0.004) - v.y) * k
# smooth the stack vertically (the hulls jump a little from level to level)
for _ in range(3):
    new = [[v.copy() for v in r] for r in grid]
    for j in range(1, len(grid) - 1):
        for i in range(NA):
            new[j][i].x = (grid[j - 1][i].x + 2 * grid[j][i].x + grid[j + 1][i].x) / 4
            new[j][i].y = (grid[j - 1][i].y + 2 * grid[j][i].y + grid[j + 1][i].y) / 4
    grid = new
# hem flares a touch, the vest hangs straight from the chest
NECK_R = (0.072, 0.066)
top = grid[-1]
for k in range(1, 7):
    t = k / 6
    row = []
    for i in range(NA):
        ang = 2 * math.pi * i / NA
        nk = Vector((neck.x + math.sin(ang) * NECK_R[0], neck.y - math.cos(ang) * NECK_R[1] + 0.01))
        xy = top[i].xy.lerp(nk, t)
        neck_base = neck.z - 0.01
        sz = surface_z(xy.x, xy.y, neck_base + 0.02)  # start below the chin
        zz = (sz + 0.014) if sz is not None else top[i].z
        zz = min(max(zz, top[i].z + 0.01 * t), neck_base + 0.012)
        if k == 6:
            zz = neck_base + 0.012 - 0.01 * max(0.0, -math.cos(ang + math.pi))  # a touch lower at the front
        row.append(Vector((xy.x, xy.y, zz)))
    grid.append(row)
bm = bmesh.new()
V = [[bm.verts.new(p_) for p_ in r] for r in grid]
for j in range(len(V) - 1):
    for i in range(NA):
        bm.faces.new((V[j][i], V[j][(i + 1) % NA], V[j + 1][(i + 1) % NA], V[j + 1][i]))
vest = new_obj("kit.vest", bm)
torso_weights(vest)
smooth(vest)
VCY = sum(p_.y for p_ in grid[len(levels) // 2]) / NA
front_y = {}  # vest front surface y by (x, z) lookup for the pockets
hem_ring = [p_.copy() for p_ in grid[0]]
neck_ring = [p_.copy() for p_ in grid[-1]]

nb = NB("M.flak")
co, xyz = nb.xyz()
base = nb.rgb(0x5b6040)
frontm = nb.math("LESS_THAN", xyz[1], VCY)
ax = nb.math("ABSOLUTE", xyz[0])
# quilting: fine stitch lines, about 5.5 cm apart on the front and back panels
th = nb.math("ARCTAN2", xyz[0], nb.math("MULTIPLY", nb.math("SUBTRACT", xyz[1], VCY), -1.0))
u = nb.math("MULTIPLY", th, 0.17 * 2 * math.pi / 0.055)
cosn = nb.n("ShaderNodeMath", operation="COSINE")
nb.L(u, cosn.inputs[0])
stitch = nb.math("POWER", nb.math("MULTIPLY", nb.math("ADD", cosn.outputs[0], 1.0), 0.5), 60.0)
panel = nb.math("MULTIPLY", nb.math("GREATER_THAN", nb.math("ABSOLUTE", nb.n("ShaderNodeMath", operation="COSINE").outputs[0]), 0.45),
                nb.math("LESS_THAN", xyz[2], yoke_z))
cth = panel.node.inputs[0].links[0].from_node.inputs[0].links[0].from_node.inputs[0].links[0].from_node
nb.L(th, cth.inputs[0])
stitch = nb.math("MULTIPLY", stitch, panel)
flap = nb.math("MULTIPLY", frontm, nb.math("LESS_THAN", ax, 0.028))
flap_edge = nb.math("MULTIPLY", frontm, nb.math("MULTIPLY", nb.math("GREATER_THAN", ax, 0.026), nb.math("LESS_THAN", ax, 0.03)))
zip_line = nb.math("MULTIPLY", frontm, nb.math("MULTIPLY", nb.math("GREATER_THAN", ax, 0.03), nb.math("LESS_THAN", ax, 0.036)))
sn = nb.n("ShaderNodeMath", operation="SINE")
nb.L(nb.math("MULTIPLY", xyz[2], 2 * math.pi / 0.085), sn.inputs[0])
snaps = nb.math("MULTIPLY", nb.math("MULTIPLY", frontm, nb.math("LESS_THAN", nb.math("ABSOLUTE", nb.math("SUBTRACT", ax, 0.016)), 0.0045)),
                nb.math("GREATER_THAN", sn.outputs[0], 0.96))
wr = nb.noise(co, 14.0, 4, 0.6)  # cloth wrinkles, strongest at the waist and under the arms
fade = nb.noise(co, 5.0, 3)
c = nb.mix(nb.math("MULTIPLY", nb.math("SUBTRACT", fade.outputs[0], 0.5), 0.6), base, (0.36, 0.37, 0.25, 1))
c = nb.mix(nb.math("MULTIPLY", stitch, 0.55), c, (0.09, 0.09, 0.06, 1))
c = nb.mix(nb.math("MULTIPLY", nb.math("ADD", flap_edge, zip_line), 0.75), c, (0.07, 0.07, 0.05, 1))
c = nb.mix(snaps, c, nb.rgb(0x2a2a22))
grime = nb.noise(co, 12.0, 5)
c = nb.mix(nb.math("MULTIPLY", nb.math("SUBTRACT", grime.outputs[0], 0.55, clamp=True), 1.2), c, (0.25, 0.21, 0.14, 1))
hgt = nb.math("ADD", nb.math("MULTIPLY", stitch, -0.4), nb.math("MULTIPLY", flap, 0.5))
hgt = nb.math("ADD", hgt, nb.math("MULTIPLY", snaps, 0.3))
hgt = nb.math("ADD", hgt, nb.math("MULTIPLY", wr.outputs[0], 0.6))
hgt = nb.math("ADD", hgt, nb.math("MULTIPLY", nb.noise(co, 900.0, 2).outputs[0], 0.08))
flak_mat = register(nb.finish(c, 0.62, 0.0, 1.0, nb.bump(hgt, 0.35, dist=0.004)), 1)
assign(vest, flak_mat)
smart_uv(vest)
tape_mat = flat_mat("M.tape", 0x4c5034, 0.7, 0, 600, 0.15, 0.08)


def kit_piece(bm, name, mat, collar=False, bone=None):
    o = new_obj(name, bm)
    if bone:
        rigid_skin(o, *bone) if isinstance(bone, tuple) else rigid_skin(o, bone)
    else:
        torso_weights(o, collar=collar)
    smooth(o)
    assign(o, mat)
    smart_uv(o)
    return o


# piped hem
kit_piece(tube([p_ + (p_ - Vector((p_.x * 0 + sum(q.x for q in hem_ring) / NA, sum(q.y for q in hem_ring) / NA, p_.z))).normalized() * 0.002 for p_ in hem_ring], 0.006, 6, True),
          "kit.vest_hem", tape_mat)
# padded collar roll: close round the neck, rising only a little, sagging at the front where it opens
cr = []
for i in range(NA + 1):
    ang = math.radians(16) + (2 * math.pi - math.radians(32)) * i / NA  # open at the front
    p_ = neck_ring[0].copy()
    j = (ang / (2 * math.pi)) * NA
    a0, a1 = neck_ring[int(j) % NA], neck_ring[(int(j) + 1) % NA]
    p_ = a0.lerp(a1, j - int(j))
    out = Vector((p_.x - neck.x, p_.y - neck.y, 0)).normalized()
    sag = 0.012 * max(0.0, math.cos(ang)) ** 2
    cr.append(p_ + out * 0.004 + Vector((0, 0, 0.016 - sag)))
kit_piece(tube(cr, lambda t: 0.017, 10, False, taper=0.05), "kit.vest_collar", flak_mat, collar=True)
# shirt collar: a folded fabric band round the neck, under the vest collar
nk_pts = [v.co for v in parts["body"].data.vertices if abs(v.co.z - (neck_ring[0].z + 0.01)) < 0.008 and Vector((v.co.x - neck.x, v.co.y - neck.y)).length < 0.09]
if len(nk_pts) > 6:
    hb, hcn = hull2d([(q.x, q.y) for q in nk_pts])
    band_pts = []
    for i in range(40):
        ang = 2 * math.pi * i / 40
        q = ray_hull(hb, hcn, ang)
        q = Vector(hcn) + (q - Vector(hcn)) * 1.0 + (q - Vector(hcn)).normalized() * 0.007
        band_pts.append(Vector((q.x, q.y, neck_ring[0].z + 0.012 - 0.008 * max(0.0, math.cos(ang)))))
    kit_piece(tube(band_pts, 0.008, 8, True), "kit.shirt_collar", register(og107("M.collar", ao=False), 1), collar=True)
delete_faces(s, lambda f: f.calc_center_median().z > neck_ring[0].z - 0.03 and Vector((f.calc_center_median().x - neck.x, f.calc_center_median().y - neck.y)).length < 0.12)
# rope shoulder pads: two low ropes on each shoulder, sunk a little into the yoke
for sx in (1, -1):
    for dy in (-0.022, 0.022):
        pts = []
        for i in range(9):
            x = sx * (0.10 + 0.085 * i / 8)
            y = neck.y + dy + 0.01
            sz = surface_z(x, y, neck.z + 0.01)
            if sz is None:
                continue
            pts.append(Vector((x, y, sz + 0.018)))
        if len(pts) >= 4:
            kit_piece(tube(pts, 0.0065, 8, False, taper=0.25), "kit.rope", flak_mat)
# armhole tape: a bound edge round each arm root
for side, sx in (("l", 1), ("r", -1)):
    a, b2 = bone_head("upperarm_" + side), bone_tail("upperarm_" + side)
    d = (b2 - a).normalized()
    cen = a + d * 0.035
    rr = [v.co for v in s.data.vertices if abs((v.co - a).dot(d) - 0.035) < 0.015 and dominant_bone(v, s) == "upperarm_" + side]
    rad = min(0.07, (sum(((q - a) - d * (q - a).dot(d)).length for q in rr) / len(rr) + 0.005)) if rr else 0.055
    x1 = d.orthogonal().normalized()
    y1 = d.cross(x1)
    loop = [cen + (x1 * math.cos(2 * math.pi * k / 32) + y1 * math.sin(2 * math.pi * k / 32)) * rad for k in range(32)]
    kit_piece(tube(loop, 0.006, 6, True), "kit.armhole_" + side, tape_mat, bone=("upperarm_" + side, ("clavicle_" + side, 0.5)))
# cargo pockets low on the front, about a hand high, each with a flap
for sx in (1, -1):
    x = sx * 0.095
    zc = hem_z + 0.135  # above the pistol belt and its pouches
    yv = min((p_.y for r in grid[:len(levels)] for p_ in r if abs(p_.x - x) < 0.03 and abs(p_.z - zc) < 0.03), default=-0.15)
    bm = rounded_box((0.125, 0.018, 0.14), 0.006, 2)
    for v in bm.verts:
        v.co += Vector((x, yv - 0.004, zc))
    kit_piece(bm, "kit.pocket", flak_mat)
    bm = rounded_box((0.132, 0.022, 0.045), 0.006, 2)
    for v in bm.verts:
        v.co += Vector((x, yv - 0.008, zc + 0.065))
    kit_piece(bm, "kit.pocket_flap", flak_mat)
log("vest built", len(levels), "rings")

# shirt torso well inside the vest is never seen (kept near the openings so nothing shows through)
delete_faces(s, lambda f: (hem_z + 0.04 < f.calc_center_median().z < armpit_z - 0.02) and face_dom(f, s) not in ARM
             and abs(f.calc_center_median().x) < 0.12)

# 4b. sleeve cuffs: a soft double roll at each cut, above the elbow
cuff_mat = register(og107("M.cuff", ao=False), 1)
for side in "lr":
    a, c_ = elbow[side], hand_h[side]
    axis = (c_ - a).normalized()
    ring = [v.co.copy() for v in s.data.vertices if (v.co.z > 0.9 and (v.co.x > 0) == (side == "l")
                                                       and dominant_bone(v, s) in ("upperarm_" + side, "lowerarm_" + side)
                                                       and abs(sleeve_t(v.co, side) - SLEEVE_CUT) < 0.05)]
    if not ring:
        continue
    cen = sum(ring, Vector()) / len(ring)
    rad = sum(((p_ - cen) - axis * (p_ - cen).dot(axis)).length for p_ in ring) / len(ring)
    perp = axis.orthogonal().normalized()
    for dz, rr in ((-0.004, 1.0), (0.011, 1.04)):
        loop = [cen + axis * dz + (Quaternion(axis, 2 * math.pi * k / 24) @ perp) * (rad * rr + 0.004) for k in range(24)]
        kit_piece(tube(loop, 0.007, 8, True), "kit.cuff_" + side, cuff_mat, bone="upperarm_" + side)

# 4c. pistol belt: convex hull of the vest's cross-section at belt height, pushed out
def section_hull(obj, z, band=0.012):
    pts = [(v.co.x, v.co.y) for v in obj.data.vertices if abs(v.co.z - z) < band]
    pts = sorted(set((round(x, 4), round(y, 4)) for x, y in pts))

    def cross(o, a, b_):
        return (a[0] - o[0]) * (b_[1] - o[1]) - (a[1] - o[1]) * (b_[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    cx = sum(p[0] for p in hull) / len(hull)
    cy = sum(p[1] for p in hull) / len(hull)
    return hull, (cx, cy)


def hull_point(hull, cen, ang):  # ray from the centre at angle ang (0 = front, -Y), hit on the hull
    d = Vector((math.sin(ang), -math.cos(ang)))
    best = None
    for i in range(len(hull)):
        a = Vector(hull[i]) - Vector(cen)
        b_ = Vector(hull[(i + 1) % len(hull)]) - Vector(cen)
        e = b_ - a
        den = d.x * (-e.y) - d.y * (-e.x)
        if abs(den) < 1e-9:
            continue
        t = (a.x * (-e.y) - a.y * (-e.x)) / den
        u = (d.x * a.y - d.y * a.x) / den
        if t > 0 and -1e-6 <= u <= 1 + 1e-6:
            best = t if best is None else min(best, t)
    return Vector(cen) + d * best


hull, cen = section_hull(vest, belt_z - 0.015)
N = 40
bm = bmesh.new()
rings = []
for (dz, off) in ((-0.03, 0.006), (0.028, 0.006), (0.028, 0.0), (-0.03, 0.0)):
    row = []
    for i in range(N):
        ang = 2 * math.pi * i / N
        p = hull_point(hull, cen, ang)
        dirv = (p - Vector(cen)).normalized()
        q = p + dirv * (0.004 + off)
        row.append(bm.verts.new((q.x, q.y, belt_z - 0.015 + dz)))
    rings.append(row)
for j in range(4):
    for i in range(N):
        a_, b_ = rings[j], rings[(j + 1) % 4]
        bm.faces.new((a_[i], a_[(i + 1) % N], b_[(i + 1) % N], b_[i]))
belt = new_obj("kit.belt", bm)
rigid_skin(belt, "pelvis")
nb = NB("M.webbing")
co, xyz = nb.xyz()
c = nb.mix(nb.math("MULTIPLY", nb.noise(co, 60.0, 3).outputs[0], 0.3), nb.rgb(0x5f623f), (0.2, 0.2, 0.13, 1))
weave = nb.n("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Z")
weave.inputs["Scale"].default_value = 160.0
nb.L(co, weave.inputs["Vector"])
eyelet = nb.n("ShaderNodeTexVoronoi")
eyelet.inputs["Scale"].default_value = 55.0
nb.L(co, eyelet.inputs["Vector"])
hole = nb.math("LESS_THAN", eyelet.outputs["Distance"], 0.06)
c = nb.mix(hole, c, nb.rgb(0x22221c))
webbing = register(nb.finish(c, 0.85, 0.0, 1.0, nb.bump(nb.math("ADD", weave.outputs["Fac"], nb.math("MULTIPLY", hole, -1)), 0.25, dist=0.0015)), 1)
assign(belt, webbing)
smart_uv(belt)


def place_on_belt(bm, ang, depth, zc, name, bone="pelvis"):
    p = hull_point(hull, cen, ang)
    out = (p - Vector(cen)).normalized()
    pos = Vector((p.x, p.y, zc)) + Vector((out.x, out.y, 0)) * (0.012 + depth / 2)
    yaw = math.atan2(out.x, -out.y)
    M = Matrix.Translation(pos) @ Matrix.Rotation(-yaw, 4, "Z")
    for v in bm.verts:
        v.co = M @ v.co
    o = new_obj(name, bm)
    rigid_skin(o, bone)
    return o


# M1956 universal ammo pouches, front left and right of the buckle (box with a lid)
for i, ang in enumerate((math.radians(-38), math.radians(38))):
    bm = rounded_box((0.10, 0.065, 0.115), 0.01)
    lid = rounded_box((0.106, 0.072, 0.03), 0.006)
    for v in lid.verts:
        v.co.z += 0.055
    tmp = bpy.data.meshes.new("tmp")
    lid.to_mesh(tmp)
    lid.free()
    bm.from_mesh(tmp)
    bpy.data.meshes.remove(tmp)
    o = place_on_belt(bm, ang, 0.065, belt_z - 0.045, "kit.pouch%d" % i)
    assign(o, webbing)
    smart_uv(o)
# canteens in covers, rear hips
can_mat = flat_mat("M.canteen", 0x535838, 0.92, 0, 300, 0.2)
for i, ang in enumerate((math.radians(-135), math.radians(135))):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.5)
    for v in bm.verts:
        z = v.co.z
        v.co = Vector((v.co.x * 0.135, v.co.y * 0.075, z * 0.19))
        if z > 0.35:
            v.co.z = min(v.co.z, 0.085)
    o = place_on_belt(bm, ang, 0.075, belt_z - 0.10, "kit.canteen%d" % i)
    assign(o, can_mat)
    smart_uv(o)
# buckle
buckle_mat = flat_mat("M.metal_dark", 0x2b2a26, 0.5, 0.6)
bm = rounded_box((0.06, 0.012, 0.05), 0.004, 1)
o = place_on_belt(bm, 0.0, 0.012, belt_z - 0.015, "kit.buckle")
assign(o, buckle_mat)
smart_uv(o)

# 4d. M1 helmet, Mitchell cover, after the photographs: it sits low (rim about 1.5 cm above the brows), the shell
# follows the head with the liner rim showing under it, a narrow dark elastic band, chinstraps hanging loose
headpts = [v.co for v in b.data.vertices if v.co.z > headc.z + 0.05]
hx = (min(p.x for p in headpts), max(p.x for p in headpts))
hy = (min(p.y for p in headpts), max(p.y for p in headpts))
htop = max(p.z for p in headpts)
brow_z = sum(v.co.z for v in parts["brows"].data.vertices) / max(1, len(parts["brows"].data.vertices))
hc = Vector(((hx[0] + hx[1]) / 2, (hy[0] + hy[1]) / 2 + 0.006, 0))
rx, ry = (hx[1] - hx[0]) / 2 + 0.02, (hy[1] - hy[0]) / 2 + 0.022
rz = 0.128
ZMIN = -0.06


def helm_pt(th, zr, grow=0.0):
    """Shell surface: th = angle round the head (0 = +x), zr = height on the dome in [ZMIN, 1]."""
    x, y = math.cos(th), math.sin(th)
    rr = math.sqrt(max(0.0, 1 - max(zr, 0.0) ** 2))
    flare = 1.0 + 0.09 * max(0.0, 0.22 - zr) / 0.28
    ripple = 1.0 + 0.008 * math.sin(9 * th + 1.3) * max(0.0, 0.3 - zr) / 0.36
    k = rr * flare * ripple
    back = 0.03 * max(0.0, y) * max(0.0, 0.3 - zr) / 0.36  # lower over the nape
    return Vector((hc.x + x * (rx * k + grow), hc.y + y * (ry * k + grow), base_z + zr * rz - back))


base_z = brow_z + 0.015 - ZMIN * rz + 0.003  # front rim (y < 0) about 1.5 cm above the brows
NT, NZ = 32, 12
bm = bmesh.new()
zs = [ZMIN + (1 - ZMIN) * (j / NZ) ** 0.9 for j in range(NZ)]
rows = [[bm.verts.new(helm_pt(2 * math.pi * i / NT, z)) for i in range(NT)] for z in zs]
apex = bm.verts.new(Vector((hc.x, hc.y, base_z + rz)))
for j in range(NZ - 1):
    for i in range(NT):
        bm.faces.new((rows[j][i], rows[j][(i + 1) % NT], rows[j + 1][(i + 1) % NT], rows[j + 1][i]))
for i in range(NT):
    bm.faces.new((rows[-1][i], rows[-1][(i + 1) % NT], apex))
# rolled rim: the cover tucks round the edge
rim_in = [bm.verts.new(helm_pt(2 * math.pi * i / NT, ZMIN, -0.007) - Vector((0, 0, 0.004))) for i in range(NT)]
for i in range(NT):
    bm.faces.new((rim_in[i], rim_in[(i + 1) % NT], rows[0][(i + 1) % NT], rows[0][i]))
helmet = new_obj("kit.helmet", bm)
rigid_skin(helmet, "head")
smooth(helmet)
nb = NB("M.mitchell")
co, xyz = nb.xyz()
# Mitchell pattern, green side, soft contrast: leaf shapes 5-8 cm across in two greens and a brown on a light green
# ground (thresholded, domain-warped noise), cloth weave and soft folds in the bump
warp = nb.noise(co, 7.0, 3, 0.6)
wv = nb.n("ShaderNodeVectorMath", operation="ADD")
nb.L(co, wv.inputs[0])
sc = nb.n("ShaderNodeVectorMath", operation="SCALE")
nb.L(warp.outputs["Color"], sc.inputs[0])
sc.inputs["Scale"].default_value = 0.06
nb.L(sc.outputs[0], wv.inputs[1])
c = nb.rgb(0x86a058)
for scale, thr, hexc, off in ((13.0, 0.52, 0x4f7a34, 0.0), (11.0, 0.60, 0x6e6338, 3.7), (16.0, 0.60, 0x355a26, 7.1), (20.0, 0.64, 0x9db56a, 11.3)):
    o_ = nb.n("ShaderNodeVectorMath", operation="ADD")
    nb.L(wv.outputs[0], o_.inputs[0])
    o_.inputs[1].default_value = (off, off * 0.7, off * 1.3)
    n_ = nb.noise(o_.outputs[0], scale, 2.0, 0.45)
    m_ = nb.math("MULTIPLY", nb.math("SUBTRACT", n_.outputs[0], thr), 30.0, clamp=True)
    c = nb.mix(m_, c, nb.rgb(hexc))
fade = nb.noise(co, 8.0, 3)
c = nb.mix(nb.math("MULTIPLY", nb.math("SUBTRACT", fade.outputs[0], 0.45, clamp=True), 0.5), c, (0.33, 0.32, 0.23, 1))
cloth = nb.noise(co, 2400.0, 1)
fold_co = nb.n("ShaderNodeVectorMath", operation="MULTIPLY")
nb.L(co, fold_co.inputs[0])
fold_co.inputs[1].default_value = (1.0, 1.0, 3.0)
folds = nb.noise(fold_co.outputs[0], 16.0, 3)
hgt = nb.math("ADD", nb.math("MULTIPLY", cloth.outputs[0], 0.3), nb.math("MULTIPLY", folds.outputs[0], 1.0))
assign(helmet, register(nb.finish(c, 0.9, 0.0, 1.0, nb.bump(hgt, 0.4, dist=0.004)), 1))
smart_uv(helmet)
# liner rim just inside the shell edge (fills the gap to the head)
bm = bmesh.new()
lr0 = [bm.verts.new(helm_pt(2 * math.pi * i / NT, ZMIN, -0.012) - Vector((0, 0, 0.003))) for i in range(NT)]
lr1 = [bm.verts.new(helm_pt(2 * math.pi * i / NT, ZMIN + 0.16, -0.02)) for i in range(NT)]
for i in range(NT):
    bm.faces.new((lr0[i], lr0[(i + 1) % NT], lr1[(i + 1) % NT], lr1[i]))
liner = new_obj("kit.liner", bm)
rigid_skin(liner, "head")
smooth(liner)
assign(liner, flat_mat("M.liner", 0x3b3424, 0.7, 0, 0, 0, 0.1))
smart_uv(liner)
# narrow elastic band (2.5 cm), dark
bm = bmesh.new()
zb0, zb1 = 0.20, 0.20 + 0.025 / rz
b0 = [bm.verts.new(helm_pt(2 * math.pi * i / NT, zb0, 0.0035)) for i in range(NT)]
b1 = [bm.verts.new(helm_pt(2 * math.pi * i / NT, zb1, 0.0035)) for i in range(NT)]
for i in range(NT):
    bm.faces.new((b0[i], b0[(i + 1) % NT], b1[(i + 1) % NT], b1[i]))
band = new_obj("kit.band", bm)
rigid_skin(band, "head")
smooth(band)
assign(band, flat_mat("M.band", 0x2b2c25, 0.75, 0, 500, 0.2, 0.06))
smart_uv(band)
# chinstraps, unfastened, hanging from each side of the liner
for sx in (1, -1):
    th = 0.0 if sx > 0 else math.pi
    top = helm_pt(th + sx * 0.25, ZMIN, -0.008)
    pts = [top + Vector((0, -0.01 * t, -0.11 * t)) for t in (0, 0.33, 0.66, 1.0)]
    bm = bmesh.new()
    prev = None
    for p_ in pts:
        a1 = bm.verts.new(p_ + Vector((0, -0.007, 0)))
        a2 = bm.verts.new(p_ + Vector((0, 0.007, 0)))
        if prev:
            bm.faces.new((prev[0], prev[1], a2, a1))
        prev = (a1, a2)
    st = new_obj("kit.chinstrap", bm)
    rigid_skin(st, "head")
    smooth(st)
    assign(st, MATS["M.band"][0].m)
    smart_uv(st)
log("kit built")

# ---------------------------------------------------------------- 5. animation: walk and stand, IK baked to FK
scn = bpy.context.scene
scn.render.fps = 24
rig.data.pose_position = "POSE"
pb = rig.pose.bones
for p_ in pb:
    p_.rotation_mode = "QUATERNION"


def bone_world(name):
    return rig.matrix_world @ pb[name].matrix


thigh_len = (bone_head("calf_l") - bone_head("thigh_l")).length
calf_len = (bone_head("foot_l") - bone_head("calf_l")).length
LEG = thigh_len + calf_len
ank0 = {s_: bone_head("foot_" + s_) for s_ in "lr"}
ball0 = {s_: bone_head("ball_" + s_) for s_ in "lr"}
hip0 = {s_: bone_head("thigh_" + s_) for s_ in "lr"}
pelvis_rest = rig.data.bones["pelvis"].matrix_local.copy()
log("leg", round(thigh_len, 3), round(calf_len, 3))


def empty(name):
    o = bpy.data.objects.new(name, None)
    COLL.objects.link(o)
    o.rotation_mode = "QUATERNION"
    return o


E = {k: empty("ctl." + k) for k in ("ank_l", "ank_r", "ftrot_l", "ftrot_r", "pole_l", "pole_r", "hand_l", "hand_r", "elb_l", "elb_r")}
for s_ in "lr":
    c = pb["calf_" + s_].constraints.new("IK")
    c.target, c.pole_target, c.chain_count, c.use_tail = E["ank_" + s_], E["pole_" + s_], 2, True
    c.pole_angle = math.radians(-90)
    c2 = pb["foot_" + s_].constraints.new("COPY_ROTATION")
    c2.target = E["ftrot_" + s_]
    c = pb["lowerarm_" + s_].constraints.new("IK")
    c.target, c.pole_target, c.chain_count, c.use_tail = E["hand_" + s_], E["elb_" + s_], 2, True
    c.pole_angle = math.radians(-90)
    c2 = pb["hand_" + s_].constraints.new("COPY_ROTATION")
    c2.target = E["hand_" + s_]


def set_pose_rot(name, eul_world_delta):
    """Rotate a bone by a rotation given in armature space, about its own head."""
    bone = rig.data.bones[name]
    R = bone.matrix_local.to_3x3()
    q = (R.inverted() @ eul_world_delta.to_matrix() @ R).to_quaternion()
    pb[name].rotation_quaternion = q


def key(o, frame, loc=True, rot=True):
    if loc:
        o.keyframe_insert("location", frame=frame)
    if rot:
        o.keyframe_insert("rotation_quaternion", frame=frame)


# The rifle, in chest space: low ready, right hand on the pistol grip, left under the handguard
# Port arms, as in the photographs: rifle diagonal across the chest, right hand on the pistol grip low on the right,
# left hand on the handguard, muzzle up past the left shoulder, sights facing out
RIFLE_F = Vector((0.62, -0.15, 0.77)).normalized()  # about 45 degrees, up and to his left
grip_local_chest = Vector((-0.05, -0.22, -0.22))  # from the spine_03 head, in armature axes, at rest


def rifle_frame(chest_M):
    """World matrix of the rifle (origin at the pistol-grip hand point, +Y muzzle, +Z sights) for a chest pose."""
    rest = rig.data.bones["spine_03"].matrix_local
    delta = chest_M @ rest.inverted()  # chest motion from rest
    f = RIFLE_F
    u0 = Vector((-1, 0, 0.8))  # sights up and to his right, magazine down-left: the rifle's side faces forward (worn photo)
    u = (u0 - f * u0.dot(f)).normalized()
    r_ = f.cross(u)
    M = Matrix((r_, f, u)).transposed().to_4x4()
    M.translation = rest.translation + grip_local_chest
    return delta @ M


def hand_target(rifle_M, side):
    """Wrist position and hand orientation (bone axes) that hold the rifle."""
    R = rifle_M.to_3x3()
    rx_, fy, uz = R.col[0], R.col[1], R.col[2]
    if side == "r":  # pistol grip: palm on the grip's right side, knuckles along the grip, fingers wrapping round it
        g = (R @ Vector((0.0, -0.33, -1.0))).normalized()   # the grip's long axis (raked back)
        palm_pt = rifle_M @ Vector((0.0, -0.032, -0.045))
        hand_dir = (fy - g * fy.dot(g)).normalized()
        palm_n = -rx_
        wrist = palm_pt - hand_dir * 0.05 + rx_ * 0.022
    else:  # handguard from below, palm up, fingers to the right
        palm_pt = rifle_M @ Vector((0.0, 0.27, 0.024))      # under the handguard
        hand_dir = (rx_ * 0.85 + fy * 0.35).normalized()
        palm_n = uz
        wrist = palm_pt - hand_dir * 0.05 - uz * 0.026
    return wrist, hand_dir, palm_n


# rest-space hand axes: bone Y = toward the fingers; find which bone axis is the palm normal
def palm_axis(side):
    bone = rig.data.bones["hand_" + side]
    R = bone.matrix_local.to_3x3()
    inward = Vector((-1, 0, 0)) if side == "l" else Vector((1, 0, 0))
    best = max(((R.col[i].dot(inward) * sg, i, sg) for i in (0, 2) for sg in (1, -1)))
    return best[1], best[2]


PALM = {s_: palm_axis(s_) for s_ in "lr"}


def hand_quat(side, hand_dir, palm_n):
    ai, sg = PALM[side]
    y = hand_dir.normalized()
    pn = (palm_n - y * palm_n.dot(y)).normalized() * sg
    if ai == 0:
        x = pn
        z = x.cross(y)
    else:
        z = pn
        x = y.cross(z)
    return Matrix((x, y, z)).transposed().to_quaternion()


# finger curl: find the local axis/sign that bends fingers toward the palm
def curl_fingers(side, amount, index=None):
    ai, sg = PALM[side]
    for f_ in ("index", "middle", "ring", "pinky"):
        amt_f = index if (f_ == "index" and index is not None) else amount
        for k in (1, 2, 3):
            n = "%s_0%d_%s" % (f_, k, side)
            if n not in pb:
                continue
            bone = rig.data.bones[n]
            R = bone.matrix_local.to_3x3()
            palm_w = rig.data.bones["hand_" + side].matrix_local.to_3x3().col[ai] * sg
            axis = R.col[1].cross(palm_w)  # rotate fingertip toward the palm
            local_axis = (R.inverted() @ axis).normalized()
            pb[n].rotation_quaternion = Quaternion(local_axis, amt_f * (0.9 if k == 1 else 1.1))
    for k in (1, 2, 3):
        n = "thumb_0%d_%s" % (k, side)
        bone = rig.data.bones[n]
        R = bone.matrix_local.to_3x3()
        palm_w = rig.data.bones["hand_" + side].matrix_local.to_3x3().col[ai] * sg
        axis = R.col[1].cross(palm_w)
        pb[n].rotation_quaternion = Quaternion((R.inverted() @ axis).normalized(), amount * 0.45)


SPEED = 1.15  # m/s, patrol pace
FR = 24       # frames per cycle (1 s at 24 fps)
STANCE = 0.62
FWD = Vector((0, -1, 0))


def foot_state(phase):
    """Ankle offset along the walk (m, + forward), ankle lift, foot pitch (rad, + toes up), toe bend."""
    half = SPEED * STANCE / 2
    if phase < STANCE:  # planted: slides back at walking speed (the root moves forward in three.js)
        t = phase / STANCE
        x = half - 0.04 - SPEED * phase
        pitch = 0.0
        if t < 0.12:
            pitch = math.radians(14) * (1 - t / 0.12) ** 2  # heel strike, foot rolls flat
        elif t > 0.62:
            pitch = -math.radians(36) * ((t - 0.62) / 0.38) ** 1.6  # heel rises, rolls over the ball
        return x, 0.0, pitch, (-pitch * 0.7 if pitch < 0 else 0.0)
    t = (phase - STANCE) / (1 - STANCE)
    s_ = t * t * (3 - 2 * t)
    x = (-half - 0.04) + (2 * half) * s_
    lift = 0.10 * math.sin(math.pi * min(1, t * 1.15)) ** 1.2
    pitch = -math.radians(36) * (1 - t) ** 2 + math.radians(14) * t ** 3 - math.radians(10) * math.sin(math.pi * t)
    return x, lift, pitch, max(0.0, -pitch) * (1 - t) * 0.45


def ankle_from(side, x, lift, pitch):
    """World ankle position and foot rotation for a foot that pivots about the heel (toes up) or the ball (heel up)."""
    a0 = ank0[side].copy()
    a0.y = 0.0 + (ank0[side].y - (ank0["l"].y + ank0["r"].y) / 2)
    base = Vector((math.copysign(0.105, a0.x), a0.y + (-x), 0.0))
    ankle_h = ank0[side].z
    heel = Vector((0, 0.055, -ankle_h))  # heel contact relative to the ankle
    ball = Vector((0, (ball0[side] - ank0[side]).y, (ball0[side] - ank0[side]).z - 0.0))
    Rp = Matrix.Rotation(pitch, 3, "X")  # + pitch = toes up (front is -Y)
    if pitch >= 0:
        piv = heel
    else:
        piv = Vector((ball.x, ball.y, -ankle_h))
    off = -piv
    ank = base + Vector((0, 0, ankle_h)) + piv + Rp @ off
    ank.z += lift
    return ank, Rp


def walk_pose(f):
    ph = f / FR
    ph_l, ph_r = ph % 1.0, (ph + 0.5) % 1.0
    feet = {}
    for side, p_ in (("l", ph_l), ("r", ph_r)):
        x, lift, pitch, toe = foot_state(p_)
        ank, Rp = ankle_from(side, x, lift, pitch)
        feet[side] = (ank, Rp, toe)
    w = 2 * math.pi * ph
    bob = -0.035 - 0.016 * math.cos(2 * w)  # lowest at double support
    sway = 0.018 * math.sin(w)  # over the stance foot
    return feet, bob, sway, w


def leg_reach_ok(pelvis_off, feet):
    for side in "lr":
        hp_ = hip0[side] + pelvis_off
        if (feet[side][0] - hp_).length > LEG * 0.985:
            return False
    return True


def pose_frame(f, mode):
    if mode == "walk":
        feet, bob, sway, w = walk_pose(f)
        off = Vector((sway, 0.0, bob))
        for _ in range(40):  # drop the hips until both legs reach
            if leg_reach_ok(off, feet):
                break
            off.z -= 0.003
        yaw = math.radians(5) * math.sin(w)
        roll = math.radians(2.5) * math.sin(w)
        lean = math.radians(5)
    else:
        b_ = 0.006 * math.sin(2 * math.pi * f / FR)
        feet = {}
        for side, fwd in (("l", 0.06), ("r", -0.07)):
            ank, Rp = ankle_from(side, fwd, 0.0, 0.0)
            ank.x = math.copysign(0.13, ank0[side].x)
            feet[side] = (ank, Matrix.Rotation(0, 3, "X") @ Matrix.Rotation(math.copysign(0.12, ank0[side].x), 3, "Z"), 0.0)
        off = Vector((0.01, 0.0, -0.012 + b_ * 0.2))
        yaw, roll, lean, w = math.radians(-6), math.radians(1.5), math.radians(2), 0.0
    pb["pelvis"].location = (0, 0, 0)
    # pelvis offset in armature space -> bone local
    Rpel = rig.data.bones["pelvis"].matrix_local.to_3x3()
    pb["pelvis"].location = Rpel.inverted() @ off
    set_pose_rot("pelvis", Euler((0, roll, -yaw), "XYZ"))
    set_pose_rot("spine_01", Euler((lean * 0.4, -roll * 0.5, yaw * 0.6), "XYZ"))
    set_pose_rot("spine_02", Euler((lean * 0.4, -roll * 0.3, yaw * 0.5), "XYZ"))
    set_pose_rot("spine_03", Euler((lean * 0.2, 0, 0), "XYZ"))
    set_pose_rot("neck_01", Euler((-lean * 0.5, 0, 0), "XYZ"))
    set_pose_rot("head", Euler((-lean * 0.3, 0, yaw * 0.1), "XYZ"))
    for side in "lr":
        ank, Rp, toe = feet[side]
        E["ank_" + side].location = ank
        frest = rig.data.bones["foot_" + side].matrix_local.to_3x3()
        E["ftrot_" + side].rotation_quaternion = (Rp @ frest).to_quaternion()
        knee = (hip0[side] + ank) / 2
        E["pole_" + side].location = knee + FWD * 0.8 + Vector((math.copysign(0.05, ank0[side].x), 0, 0))
        set_pose_rot("ball_" + side, Euler((-toe, 0, 0), "XYZ"))
        for k in ("pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "head", "ball_" + side):
            pb[k].keyframe_insert("rotation_quaternion", frame=f)
        pb["pelvis"].keyframe_insert("location", frame=f)
        key(E["ank_" + side], f, True, False)
        key(E["ftrot_" + side], f, False, True)
        key(E["pole_" + side], f, True, False)


def arms_frame(f):
    scn.frame_set(f)
    chest = rig.matrix_world.inverted() @ bone_world("spine_03")
    RM = rig.matrix_world @ rifle_frame(chest)
    for side in "lr":
        wrist, hd, pn = hand_target(RM, side)
        E["hand_" + side].location = wrist
        E["hand_" + side].rotation_quaternion = hand_quat(side, hd, pn)
        sh = bone_head("upperarm_" + side)
        E["elb_" + side].location = wrist.lerp(sh, 0.5) + Vector((math.copysign(0.35, ank0[side].x), 0.25, -0.15))
        key(E["hand_" + side], f)
        if f == 0:
            sh_p = bone_world("upperarm_" + side).translation
            arm = rig.data.bones["upperarm_" + side].length + rig.data.bones["lowerarm_" + side].length
            log("reach", side, round((wrist - sh_p).length, 3), "arm", round(arm, 3))
        key(E["elb_" + side], f, True, False)
    return RM


def clear_anim():
    for o in [rig] + list(E.values()):
        if o.animation_data:
            o.animation_data_clear()


def bake(name, frames):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(frame_start=0, frame_end=frames, only_selected=False, visual_keying=True,
                     clear_constraints=False, use_current_action=False, bake_types={"POSE"})
    bpy.ops.object.mode_set(mode="OBJECT")
    act = rig.animation_data.action
    act.name = name
    act.use_fake_user = True
    return act


curl_fingers("r", math.radians(62), index=math.radians(12))
curl_fingers("l", math.radians(55))
finger_q = {p_.name: p_.rotation_quaternion.copy() for p_ in pb if p_.name.split("_")[0] in ("index", "middle", "ring", "pinky", "thumb")}


def key_fingers(f):
    for n, q in finger_q.items():
        pb[n].rotation_quaternion = q
        pb[n].keyframe_insert("rotation_quaternion", frame=f)


# fit the hold: slide the rifle toward the left shoulder until both wrists are inside 93% of arm reach (rest pose)
ARM_LEN = rig.data.bones["upperarm_l"].length + rig.data.bones["lowerarm_l"].length
for _ in range(60):
    RM = rig.matrix_world @ rifle_frame(rig.data.bones["spine_03"].matrix_local)
    moved = False
    for sd in "lr":
        w_ = hand_target(RM, sd)[0]
        sh_ = bone_head("upperarm_" + sd)
        d_ = (w_ - sh_).length
        if d_ > 0.93 * ARM_LEN:
            grip_local_chest += (sh_ - w_).normalized() * (d_ - 0.93 * ARM_LEN) * 0.5
            moved = True
    if not moved:
        break
dl = (hand_target(RM, "l")[0] - bone_head("upperarm_l")).length
log("rifle grip offset", tuple(round(x, 3) for x in grip_local_chest), "left reach", round(dl, 3))

actions = {}
rifle_M0 = None
for mode, frames in (("walk", FR), ("stand", FR * 2)):
    clear_anim()
    for f in range(frames + 1):
        pose_frame(f if mode == "walk" else f * 0.5, mode)
        key_fingers(f)
    for f in range(frames + 1):
        RM = arms_frame(f)
        if f == 0 and mode == "walk":
            rifle_M0 = RM.copy()
    act = bake("Walk" if mode == "walk" else "Stand", frames)
    actions[mode] = act
    if mode == "walk":
        scn.frame_set(0)
        HAND0 = bone_world("hand_r").copy()
    # how far the wrists end up from their targets (IK reach check)
    errs = []
    for f in (0, frames // 2):
        scn.frame_set(f)
        for side in "lr":
            errs.append(round((bone_world("hand_" + side).translation - E["hand_" + side].matrix_world.translation).length, 3))
    log("baked", mode, "wrist errors", errs)
# remove the rig controls
for p_ in pb:
    for c in list(p_.constraints):
        p_.constraints.remove(c)
for o in E.values():
    bpy.data.objects.remove(o)
rig.animation_data.action = actions["walk"]
scn.frame_set(0)

# 4e. M16A1, built in its own frame at the walk's frame-0 hold, then moved to where hand_r's rest pose would carry it
def rifle_mesh():
    """M16A1 from the photographs, 99 cm: side profiles extruded to their widths (origin at the pistol-grip hand point,
    +y to the muzzle, +z up, bore 6 cm above the grip point)."""
    bm = bmesh.new()

    def prism(yz, w, x0=0.0):
        vs0 = [bm.verts.new((x0 - w / 2, y, z)) for y, z in yz]
        vs1 = [bm.verts.new((x0 + w / 2, y, z)) for y, z in yz]
        bm.faces.new(vs0[::-1])
        bm.faces.new(vs1)
        n = len(yz)
        for i in range(n):
            bm.faces.new((vs0[i], vs0[(i + 1) % n], vs1[(i + 1) % n], vs1[i]))

    def cyl(y0, y1, r0, r1, seg=10, z=0.06, x=0.0, rot=0.0):
        vs = []
        for y, r in ((y0, r0), (y1, r1)):
            vs.append([bm.verts.new((x + math.cos(rot + 2 * math.pi * k / seg) * r, y, z + math.sin(rot + 2 * math.pi * k / seg) * r)) for k in range(seg)])
        bm.faces.new(vs[0])
        bm.faces.new(vs[1][::-1])
        for k in range(seg):
            bm.faces.new((vs[0][k], vs[1][k], vs[1][(k + 1) % seg], vs[0][(k + 1) % seg]))

    # fixed A1 buttstock with buttplate: tapers from the receiver to the butt, drops below the bore line
    prism([(-0.105, 0.078), (-0.36, 0.078), (-0.37, 0.07), (-0.37, -0.06), (-0.36, -0.068), (-0.30, -0.05), (-0.13, 0.012), (-0.105, 0.015)], 0.036)
    prism([(-0.372, 0.074), (-0.382, 0.074), (-0.382, -0.064), (-0.372, -0.064)], 0.038)   # buttplate
    # lower receiver with magazine well and trigger guard
    prism([(-0.105, 0.04), (0.10, 0.04), (0.10, 0.0), (0.09, -0.028), (0.03, -0.028), (0.025, -0.005), (-0.105, 0.0)], 0.024)
    prism([(-0.005, -0.012), (0.055, -0.012), (0.055, -0.026), (-0.005, -0.026)], 0.006)  # trigger guard
    # pistol grip, raked back
    prism([(-0.008, 0.0), (-0.042, 0.0), (-0.075, -0.098), (-0.042, -0.104), (-0.016, -0.03)], 0.028)
    # 20-round magazine, straight
    prism([(0.033, -0.026), (0.088, -0.026), (0.086, -0.14), (0.035, -0.14)], 0.023)
    # upper receiver
    prism([(-0.105, 0.085), (0.135, 0.085), (0.14, 0.04), (-0.105, 0.04)], 0.025)
    # carry handle with the rear sight at its back end
    prism([(-0.075, 0.085), (-0.075, 0.142), (-0.05, 0.142), (-0.04, 0.128), (0.085, 0.128), (0.105, 0.085), (0.075, 0.085), (0.065, 0.112), (-0.025, 0.112), (-0.045, 0.085)], 0.014)
    prism([(-0.072, 0.142), (-0.052, 0.142), (-0.052, 0.152), (-0.072, 0.152)], 0.01)      # rear sight
    cyl(-0.095, -0.06, 0.008, 0.008, 8, z=0.072, x=0.016)                                  # forward assist
    # delta ring and triangular handguards (apex down)
    cyl(0.135, 0.152, 0.032, 0.032, 14)
    cyl(0.152, 0.43, 0.034, 0.03, 3, rot=math.radians(90))
    # front sight base with bayonet lug, the A-frame post, barrel, birdcage flash hider
    prism([(0.43, 0.075), (0.47, 0.075), (0.47, 0.035), (0.43, 0.035)], 0.022)
    prism([(0.438, 0.075), (0.452, 0.148), (0.458, 0.148), (0.462, 0.075)], 0.008)
    prism([(0.45, 0.035), (0.47, 0.035), (0.47, 0.018), (0.45, 0.018)], 0.012)             # bayonet lug
    cyl(0.43, 0.585, 0.0095, 0.009, 10)
    cyl(0.585, 0.635, 0.0115, 0.0115, 10)
    # sling swivels and the sling, from under the front sight to the butt
    cyl(0.455, 0.462, 0.008, 0.008, 6, z=0.012)
    cyl(-0.33, -0.322, 0.008, 0.008, 6, z=-0.058)
    prev = None
    for i in range(15):
        t = i / 14
        y = 0.458 * (1 - t) + (-0.326) * t
        z = 0.008 * (1 - t) + (-0.062) * t - 0.07 * math.sin(math.pi * t)
        a1, a2 = bm.verts.new((-0.0125, y, z)), bm.verts.new((0.0125, y, z))
        if prev:
            bm.faces.new((prev[0], prev[1], a2, a1))
        prev = (a1, a2)
    return bm


rbm = rifle_mesh()
hand_rest = rig.matrix_world @ rig.data.bones["hand_r"].matrix_local
hand_pose = HAND0
K = hand_rest @ hand_pose.inverted() @ rifle_M0
for v in rbm.verts:
    v.co = K @ v.co
RIFLE_MARKERS = [list(K @ Vector(p_)) for p_ in ((0, 0, 0), (0, 0.635, 0.06), (0, 0, 0.15))]  # grip, muzzle, up (rest space)
rifle = new_obj("kit.rifle", rbm)
rigid_skin(rifle, "hand_r")
nb = NB("M.rifle")
co, xyz = nb.xyz()
assign(rifle, register(nb.finish(nb.mix(nb.math("MULTIPLY", nb.noise(co, 80.0, 3).outputs[0], 0.25), nb.rgb(0x1e1e1c), (0.08, 0.08, 0.075, 1)),
                                 0.5, 0.35, 1.0, nb.bump(nb.noise(co, 1500.0, 2).outputs[0], 0.08, dist=0.0003)), 1))
smart_uv(rifle)
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = rifle
rifle.select_set(True)
try:
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
except Exception as ex:
    log("smooth by angle unavailable", ex)
rifle.select_set(False)
log("rifle placed")

# T-pose (arms horizontal): the pose of the FBX sent to Mixamo, also exported as a 2-frame "TPose" clip so the page
# can retarget Mixamo clips (which are relative to that T-pose) onto this rig
def tpose_pose():
    for p_ in pb:
        p_.rotation_quaternion = (1, 0, 0, 0)
        p_.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for side in "lr":
        for bn in ("upperarm_", "lowerarm_"):
            bone = rig.data.bones[bn + side]
            d = (bone.tail_local - bone.head_local).normalized()
            target = Vector((1 if side == "l" else -1, 0, 0))
            q_arm = d.rotation_difference(target)
            if bn == "upperarm_":
                set_pose_rot(bn + side, q_arm.to_euler())
            else:
                # lowerarm: straighten relative to the already-rotated upper arm
                bpy.context.view_layer.update()
                cur = (rig.pose.bones[bn + side].tail - rig.pose.bones[bn + side].head).normalized()
                dq = cur.rotation_difference(target)
                R = rig.pose.bones[bn + side].matrix.to_3x3()
                local = R.inverted() @ dq.to_matrix() @ R
                pb[bn + side].rotation_quaternion = local.to_quaternion() @ pb[bn + side].rotation_quaternion
    bpy.context.view_layer.update()


rig.animation_data.action = None
rig.data.pose_position = "POSE"
tpose_pose()
for f in (0, 1):
    for p_ in pb:
        p_.keyframe_insert("rotation_quaternion", frame=f)
        p_.keyframe_insert("location", frame=f)
actions["tpose"] = rig.animation_data.action
actions["tpose"].name = "TPose"
actions["tpose"].use_fake_user = True
rig.animation_data.action = None


# ---------------------------------------------------------------- 6. join, atlas UVs, bake two texture sets
rig.data.pose_position = "REST"
rig.animation_data.action = None
for p_ in pb:
    p_.rotation_quaternion = (1, 0, 0, 0)
    p_.location = (0, 0, 0)
meshes = [o for o in bpy.data.objects if o.type == "MESH" and (o.name.startswith("src.") or o.name.startswith("kit."))]
for o in meshes:
    if o.name == "kit.rifle":
        continue
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception:
        for p_ in o.data.polygons:
            p_.use_smooth = True
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    if not o.data.uv_layers:
        smart_uv(o)
    o.data.uv_layers[0].name = "UVMap"
    for m in list(o.modifiers):
        if m.type != "ARMATURE":
            o.modifiers.remove(m)
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts["body"]
bpy.ops.object.join()
man = parts["body"]
man.name = "Marine"
man.data.name = "Marine"
for m in list(man.modifiers):
    if m.type == "ARMATURE" and m.object is None:
        man.modifiers.remove(m)
log("joined tris", tris_of(man))

# atlas UV: copy UVMap, equalise texel density, then favour the face, then pack each set into 0..1
atlas = man.data.uv_layers.new(name="atlas")
man.data.uv_layers.active = atlas
uvmap_layer = man.data.uv_layers["UVMap"]
uvmap_layer.active_render = True
mat_set = [MATS[m.name][1] if m.name in MATS else 1 for m in man.data.materials]
mat_name = [m.name for m in man.data.materials]
log("materials", list(zip(mat_name, mat_set)))

ISLAND_SCALE = {"M.skin": 1.0, "M.eyes": 1.6, "M.hair": 0.35, "M.brows": 0.8, "M.lashes": 0.6, "M.rifle": 1.5,
                "M.utilities": 0.9, "M.helmet": 1.0}


def pack_set(setidx):
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(man.data)
    uv = bm.loops.layers.uv["atlas"]
    for f in bm.faces:
        f.select = mat_set[f.material_index] == setidx
    bmesh.update_edit_mesh(man.data)
    bpy.context.scene.tool_settings.use_uv_select_sync = True
    bpy.ops.uv.average_islands_scale()
    # favour faces above the neck (skin set) by scaling their islands about their own centre
    bm = bmesh.from_edit_mesh(man.data)
    uv = bm.loops.layers.uv["atlas"]
    sel = [f for f in bm.faces if f.select]
    # union-find islands
    parent = {f.index: f.index for f in sel}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for f in sel:
        for l in f.loops:
            e = l.edge
            for f2 in e.link_faces:
                if f2 is f or not f2.select:
                    continue
                l2 = next(x for x in f2.loops if x.edge is e)
                if ((l[uv].uv - l2.link_loop_next[uv].uv).length < 1e-5 and (l.link_loop_next[uv].uv - l2[uv].uv).length < 1e-5):
                    ra, rb = find(f.index), find(f2.index)
                    if ra != rb:
                        parent[ra] = rb
    groups = {}
    for f in sel:
        groups.setdefault(find(f.index), []).append(f)
    for fs in groups.values():
        mname = mat_name[fs[0].material_index]
        k = ISLAND_SCALE.get(mname, 1.0)
        zc = sum(f.calc_center_median().z for f in fs) / len(fs)
        if mname == "M.skin" and zc > neck_z - 0.02:
            k *= 1.9  # the face gets the texels
        if abs(k - 1.0) < 1e-3:
            continue
        ls = [l for f in fs for l in f.loops]
        c = sum((l[uv].uv for l in ls), Vector((0, 0))) / len(ls)
        for l in ls:
            l[uv].uv = c + (l[uv].uv - c) * k
    bmesh.update_edit_mesh(man.data)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")


bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = man
man.select_set(True)
pack_set(0)
pack_set(1)

# bake setup
scn.render.engine = "CYCLES"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"
    prefs.get_devices()
    for d_ in prefs.devices:
        d_.use = True
    scn.cycles.device = "GPU"
except Exception as ex:
    log("gpu not available", ex)
scn.cycles.samples = 1
scn.cycles.use_denoising = False
scn.render.bake.margin = 6
TEX = P["tex"]


def new_img(name, alpha=False, data=False):
    im = bpy.data.images.new(name, TEX, TEX, alpha=alpha, float_buffer=False)
    if data:
        im.colorspace_settings.name = "Non-Color"
    return im


def set_targets(imgs):
    for m in man.data.materials:
        nb_, setidx = MATS[m.name]
        t = m.node_tree
        node = t.nodes.get("BAKE")
        if node is None:
            node = t.nodes.new("ShaderNodeTexImage")
            node.name = "BAKE"
            uvn = t.nodes.new("ShaderNodeUVMap")
            uvn.uv_map = "atlas"
            t.links.new(uvn.outputs[0], node.inputs[0])
        node.image = imgs[setidx]
        t.nodes.active = node
        node.select = True


def wire(passname):
    for m in man.data.materials:
        nb_, _ = MATS[m.name]
        t = m.node_tree
        out = nb_.out
        for l in list(out.inputs[0].links):
            t.links.remove(l)
        if passname == "bsdf":
            t.links.new(nb_.bsdf.outputs[0], out.inputs[0])
            continue
        em = t.nodes.get("EMIT") or t.nodes.new("ShaderNodeEmission")
        em.name = "EMIT"
        src = nb_.sock[passname]
        for l in list(em.inputs[0].links):
            t.links.remove(l)
        if src.type == "VALUE":
            cv = t.nodes.new("ShaderNodeCombineColor")
            for i in range(3):
                t.links.new(src, cv.inputs[i])
            src = cv.outputs[0]
        t.links.new(src, em.inputs[0])
        t.links.new(em.outputs[0], out.inputs[0])


def bake_pass(kind, passname, data):
    imgs = [new_img("%s_%d" % (passname, i), data=data) for i in range(2)]
    set_targets(imgs)
    if kind == "EMIT":
        wire(passname)
        bpy.ops.object.bake(type="EMIT", margin=6, use_clear=True)
    elif kind == "NORMAL":
        wire("bsdf")
        bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", margin=6, use_clear=True)
    elif kind == "AO":
        wire("bsdf")
        scn.cycles.samples = 64
        bpy.ops.object.bake(type="AO", margin=6, use_clear=True)
        scn.cycles.samples = 1
    return [np.array(im.pixels[:], dtype=np.float32).reshape(TEX, TEX, 4) for im in imgs]


import time
t0 = time.time()
base = bake_pass("EMIT", "base", False)
alpha = bake_pass("EMIT", "alpha", True)
rough_ = bake_pass("EMIT", "rough", True)
metal_ = bake_pass("EMIT", "metal", True)
nrm = bake_pass("NORMAL", "normal", True)
ao = bake_pass("AO", "ao", True)
wire("bsdf")
log("baked textures in", round(time.time() - t0, 1), "s")


def lin2srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def save_img(arr, path, alpha_ch=None, srgb=False):
    im = bpy.data.images.new(os.path.basename(path), TEX, TEX, alpha=alpha_ch is not None)
    a = arr.copy()
    if alpha_ch is not None:
        a[..., 3] = alpha_ch
    else:
        a[..., 3] = 1.0
    if not srgb:
        im.colorspace_settings.name = "Non-Color"
    im.pixels.foreach_set(a.ravel())
    im.filepath_raw = path
    im.file_format = "PNG" if path.endswith(".png") else "JPEG"
    scn.render.image_settings.quality = 92
    im.save()
    return im


OUT = {}
for i, tag in enumerate(("skin", "kit")):
    occl = 1.0 - (0.15 if tag == "skin" else 0.55) * (1.0 - ao[i][..., :1])  # eyes sit in a closed socket: little AO on skin
    col = base[i].copy()
    col[..., :3] = col[..., :3] * occl  # emission bake is linear; sRGB conversion happens in the image (sRGB colour space)
    orm = np.ones_like(col)
    orm[..., 0] = ao[i][..., 0]
    orm[..., 1] = rough_[i][..., 0]
    orm[..., 2] = metal_[i][..., 0]
    a_ch = alpha[i][..., 0] if tag == "skin" else None
    # images are stored linear in the float buffer; Blender converts to sRGB on save for sRGB images
    OUT[tag] = dict(
        base=save_img(col, os.path.join(SCRATCH, "%s_%s_base.%s" % (P["name"], tag, "png" if a_ch is not None else "jpg")), a_ch, srgb=True),
        orm=save_img(orm, os.path.join(SCRATCH, "%s_%s_orm.jpg" % (P["name"], tag))),
        nrm=save_img(nrm[i], os.path.join(SCRATCH, "%s_%s_normal.jpg" % (P["name"], tag))))

# final two materials
FINAL = []
for tag in ("skin", "kit"):
    m = bpy.data.materials.new("Marine." + tag)
    m.use_nodes = True
    t = m.node_tree
    bs = t.nodes["Principled BSDF"]
    uvn = t.nodes.new("ShaderNodeUVMap")
    uvn.uv_map = "atlas"
    tb = t.nodes.new("ShaderNodeTexImage")
    tb.image = bpy.data.images.load(OUT[tag]["base"].filepath_raw)
    to = t.nodes.new("ShaderNodeTexImage")
    to.image = bpy.data.images.load(OUT[tag]["orm"].filepath_raw)
    to.image.colorspace_settings.name = "Non-Color"
    tn = t.nodes.new("ShaderNodeTexImage")
    tn.image = bpy.data.images.load(OUT[tag]["nrm"].filepath_raw)
    tn.image.colorspace_settings.name = "Non-Color"
    for x in (tb, to, tn):
        t.links.new(uvn.outputs[0], x.inputs[0])
    t.links.new(tb.outputs[0], bs.inputs["Base Color"])
    if tag == "skin":
        t.links.new(tb.outputs["Alpha"], bs.inputs["Alpha"])
    sep = t.nodes.new("ShaderNodeSeparateColor")
    t.links.new(to.outputs[0], sep.inputs[0])
    t.links.new(sep.outputs[1], bs.inputs["Roughness"])
    t.links.new(sep.outputs[2], bs.inputs["Metallic"])
    nm = t.nodes.new("ShaderNodeNormalMap")
    nm.uv_map = "atlas"
    t.links.new(tn.outputs[0], nm.inputs["Color"])
    t.links.new(nm.outputs[0], bs.inputs["Normal"])
    m.use_backface_culling = False
    FINAL.append(m)

lash_idx = [i for i, n in enumerate(mat_name) if n == "M.lashes"]


def finalize(o):
    idx = [mat_set[p_.material_index] for p_ in o.data.polygons]
    o.data.materials.clear()
    for m in FINAL:
        o.data.materials.append(m)
    o.data.polygons.foreach_set("material_index", idx)
    o.data.update()
    log("finalize", o.name, "kit faces", sum(idx))
    o.data.uv_layers.remove(o.data.uv_layers["UVMap"])


# LOD copy before the hero is finalised (needs the per-source materials to drop the lashes)
for tagname, test in (("fx_eye", lambda n: n == "M.eyes"), ("fx_rifle", lambda n: n == "M.rifle"), ("fx_kit", lambda n: MATS.get(n, (None, 1))[1] == 1)):
    g = man.vertex_groups.new(name=tagname)
    ids = {vi for p_ in man.data.polygons if test(mat_name[p_.material_index]) for vi in p_.vertices}
    g.add(list(ids), 1.0, "REPLACE")
lod = man.copy()
lod.data = man.data.copy()
lod.name = "Marine_LOD"
COLL.objects.link(lod)
delete_faces(lod, lambda f: f.material_index in lash_idx)
finalize(man)
finalize(lod)


INVERT_PROTECT = bool(int(P.get("invert", 0)))


def decimate_to(o, target):
    cur = tris_of(o)
    if cur <= target:
        return cur
    # protect the head: collapse it far less than the rest
    g = o.vertex_groups.get("protect") or o.vertex_groups.new(name="protect")
    hi = o.vertex_groups["head"].index
    ri = o.vertex_groups["fx_rifle"].index if "fx_rifle" in o.vertex_groups else -1
    for v in o.data.vertices:
        w = max((e.weight for e in v.groups if e.group in (hi, ri)), default=0.0)
        g.add([v.index], 1.0 - 0.85 * w, "REPLACE")
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    ratio = target / cur
    for _ in range(6):
        m = o.modifiers.new("Dec", "DECIMATE")
        m.decimate_type = "COLLAPSE"
        m.ratio = ratio
        m.vertex_group = "protect"
        m.vertex_group_factor = 1.0
        m.invert_vertex_group = INVERT_PROTECT
        m.use_collapse_triangulate = True
        dg = bpy.context.evaluated_depsgraph_get()
        rig.data.pose_position = "REST"
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        got = sum(len(p.vertices) - 2 for p in me.polygons)
        ev.to_mesh_clear()
        if got <= target:
            bpy.ops.object.modifier_move_to_index(modifier="Dec", index=0)
            bpy.ops.object.modifier_apply(modifier="Dec")
            break
        o.modifiers.remove(m)
        ratio *= target / got * 0.995
    o.vertex_groups.remove(o.vertex_groups["protect"])
    return tris_of(o)


hero_t = decimate_to(man, P["hero_tris"])
lod_t = decimate_to(lod, P["lod_tris"])
for o in (man, lod):  # triangulate for honest counts
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()
hero_t, lod_t = tris_of(man), tris_of(lod)


# face life, kept small (the camera stays 6 m or more away): blink, brow (signed), jaw open, as shape keys
def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def add_face_keys(o):
    n = len(o.data.vertices)
    co = np.zeros(n * 3)
    o.data.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)

    def grp(name):
        w = np.zeros(n)
        gi_ = o.vertex_groups[name].index
        for v in o.data.vertices:
            for e in v.groups:
                if e.group == gi_:
                    w[v.index] = e.weight
        return w
    eye, kit, headw = grp("fx_eye") > 0.5, grp("fx_kit") > 0.5, grp("head")
    skin = (~eye) & (~kit) & (headw > 0.3)
    disp = {k: np.zeros((n, 3)) for k in ("blink", "brow", "jaw")}
    for sx in (1, -1):
        ev = eye & (np.sign(co[:, 0]) == sx)
        if not ev.any():
            continue
        c = co[ev].mean(axis=0)
        r = np.linalg.norm(co[ev] - c, axis=1).max()
        rel = co - c
        near = skin & (np.abs(rel[:, 0]) < 0.006) & (rel[:, 1] < -r * 0.5) & (np.linalg.norm(rel, axis=1) < r + 0.006)
        up_z = rel[near & (rel[:, 2] > 0), 2].min() if (near & (rel[:, 2] > 0)).any() else 0.005
        lo_z = rel[near & (rel[:, 2] < 0), 2].max() if (near & (rel[:, 2] < 0)).any() else -0.005
        ell = (rel[:, 0] / 0.021) ** 2 + (rel[:, 2] / 0.017) ** 2
        f = (1 - sstep(0.55, 1.0, ell)) * sstep(r * 0.2, -r * 0.6, rel[:, 1]) * skin
        upper = rel[:, 2] > (up_z + lo_z) / 2
        amt = (up_z - lo_z - 0.0008) * (1 - sstep(up_z, up_z + 0.009, rel[:, 2]))
        disp["blink"][:, 2] -= np.where(upper, amt, -0.15 * (up_z - lo_z)) * f
        disp["blink"][:, 1] -= np.where(upper, amt * 0.35, 0) * f
        b = skin & (rel[:, 1] < 0.0)
        fb = sstep(0.008, 0.02, rel[:, 2]) * (1 - sstep(0.03, 0.05, rel[:, 2])) * (1 - sstep(0.02, 0.035, np.abs(rel[:, 0]))) * b
        disp["brow"][:, 2] += 0.0045 * fb
        log("eye", sx, "aperture", round(up_z - lo_z, 4), "r", round(r, 4))
    # jaw: rotate the lower face about a pivot below the ears
    piv = np.array([0.0, MOUTH.y + 0.085, MOUTH.z + 0.01])
    rel = co - piv
    wj = sstep(MOUTH.z - 0.001, MOUTH.z - 0.012, co[:, 2]) * (1 - sstep(MOUTH.z - 0.07, MOUTH.z - 0.095, co[:, 2]))
    wj *= sstep(piv[1] - 0.02, piv[1] - 0.06, co[:, 1]) * skin
    th = math.radians(9)
    ry = rel[:, 1] * math.cos(th) - rel[:, 2] * math.sin(th)
    rz = rel[:, 1] * math.sin(th) + rel[:, 2] * math.cos(th)
    disp["jaw"][:, 1] = (ry - rel[:, 1]) * wj
    disp["jaw"][:, 2] = (rz - rel[:, 2]) * wj
    o.shape_key_add(name="Basis", from_mix=False)
    for k, d_ in disp.items():
        kb = o.shape_key_add(name=k, from_mix=False)
        kb.data.foreach_set("co", (co + d_).ravel())
        log("shape key", k, "verts moved", int((np.abs(d_).sum(axis=1) > 1e-5).sum()))
    for g in ("fx_eye", "fx_kit"):
        o.vertex_groups.remove(o.vertex_groups[g])
    return


add_face_keys(man)
# the hero's rifle becomes its own skinned mesh, so the page can re-seat it for Mixamo clips (sling or two-hand aim)
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = man
man.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="DESELECT")
man.vertex_groups.active_index = man.vertex_groups["fx_rifle"].index
bpy.ops.object.vertex_group_select()
bpy.ops.mesh.separate(type="SELECTED")
bpy.ops.object.mode_set(mode="OBJECT")
rifle_obj = next(o for o in bpy.context.selected_objects if o is not man)
rifle_obj.name = "Marine_rifle"
rifle_obj.data.name = "Marine_rifle"
if rifle_obj.data.shape_keys:
    rifle_obj.shape_key_clear()
for o in (man, rifle_obj, lod):
    if "fx_rifle" in o.vertex_groups:
        o.vertex_groups.remove(o.vertex_groups["fx_rifle"])
hero_t = tris_of(man) + tris_of(rifle_obj)
rifle_obj["rifle_markers"] = [c for p_ in RIFLE_MARKERS for c in p_]  # glTF extras: lets the page re-seat the rifle
log("rifle separated", tris_of(rifle_obj))
for g in ("fx_eye", "fx_kit"):
    if g in lod.vertex_groups:
        lod.vertex_groups.remove(lod.vertex_groups[g])
log("tris hero", hero_t, "lod", lod_t)

# ---------------------------------------------------------------- 7. export
for act in actions.values():
    tr = rig.animation_data.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, 0, act)
rig.animation_data.action = None
rig.data.pose_position = "POSE"


def export_glb(mesh, path, tex_scale=None):
    lod.hide_set(mesh is not lod)
    man.hide_set(mesh is not man)
    rifle_obj.hide_set(mesh is not man)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    mesh.select_set(True)
    if mesh is man:
        rifle_obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=False, export_animations=True, export_animation_mode="NLA_TRACKS",
                              export_skins=True, export_image_format="AUTO", export_materials="EXPORT",
                              export_force_sampling=True, export_optimize_animation_size=True,
                              export_morph=True, export_morph_normal=False, export_extras=True)
    # alpha: hair, brows and lashes are cut-out cards
    with open(path, "rb") as fh:
        data = fh.read()
    jl = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(data[20:20 + jl])
    for m in js.get("materials", []):
        if m.get("name") == "Marine.skin":
            m["alphaMode"] = "MASK"
            m["alphaCutoff"] = 0.5
        else:
            m.pop("alphaMode", None)
        m["doubleSided"] = True
    jb = json.dumps(js, separators=(",", ":")).encode()
    jb += b" " * ((4 - len(jb) % 4) % 4)
    rest = data[20 + jl:]
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + len(rest)) + struct.pack("<II", len(jb), 0x4E4F534A) + jb + rest
    with open(path, "wb") as fh:
        fh.write(out)
    log("exported", path, os.path.getsize(path) // 1024, "KB")


# LOD textures at half size (same look, a quarter of the memory)
export_glb(man, os.path.join(HERE, P["name"] + ".glb"))
for m in FINAL:
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE":
            n.image = n.image.copy()
            n.image.scale(TEX // 2, TEX // 2)
            fp = n.image.filepath_raw
            root, ext = os.path.splitext(fp)
            n.image.filepath_raw = root + "_half" + ext
            n.image.save()
export_glb(lod, os.path.join(HERE, P["name"] + "-lod.glb"))

# T-pose FBX for Mixamo: hero mesh without the rifle, arms raised to horizontal, no rig
for m in FINAL:  # back to full-size textures
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image.name.endswith(".001"):
            n.image = bpy.data.images[n.image.name[:-4]]
tp = man.copy()
tp.data = man.data.copy()
if tp.data.shape_keys:
    tp.shape_key_clear()
tp.name = "Marine_Tpose"
COLL.objects.link(tp)
tp.hide_set(False)
rig.animation_data.action = None
for tr in list(rig.animation_data.nla_tracks):
    tr.mute = True
tpose_pose()
hi = tp.vertex_groups["hand_r"].index
delete_verts(tp, lambda v: any(e.group == hi and e.weight > 0.999 for e in v.groups) and (v.co - bone_head("hand_r")).length > 0.13)
bpy.ops.object.select_all(action="DESELECT")
bpy.context.view_layer.objects.active = tp
tp.select_set(True)
for m in list(tp.modifiers):
    bpy.ops.object.modifier_apply(modifier=m.name)
tp.parent = None
tp.vertex_groups.clear()
bpy.ops.export_scene.fbx(filepath=os.path.join(HERE, P["name"] + "-tpose.fbx"), use_selection=True, object_types={"MESH"},
                         apply_unit_scale=True, apply_scale_options="FBX_SCALE_UNITS", axis_forward="-Z", axis_up="Y",
                         path_mode="COPY", embed_textures=True, mesh_smooth_type="FACE", add_leaf_bones=False)
log("tpose fbx tris", tris_of(tp))
for p_ in pb:
    p_.rotation_quaternion = (1, 0, 0, 0)
for tr in rig.animation_data.nla_tracks:
    tr.mute = False

stats = dict(height=round(h, 3), hero_tris=hero_t, lod_tris=lod_t, tpose_tris=tris_of(tp), tex=TEX,
             bones=len(rig.data.bones), hero_verts=len(man.data.vertices), lod_verts=len(lod.data.vertices))
json.dump(stats, open(os.path.join(SCRATCH, P["name"] + "-stats.json"), "w"), indent=1)
log("STATS", stats)
if P["blend"]:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, P["name"] + ".blend"))
