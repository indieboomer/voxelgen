// Selected preview: seed 42, resolution 28, scale 1, mesh lowpoly.
// RECIPE generates all four previews and other seeds; selected_rock() reproduces the selected model.
pub const SELECTED_SEED: u32 = 42;
pub const SELECTED_RESOLUTION: usize = 28;
pub const SELECTED_SCALE: f64 = 1.0;
pub const SELECTED_MESH_MODE: MeshMode = MeshMode::Greedy;
pub fn selected_rock() -> Result<Rock,String> { generate_rock_with_mode(&RECIPE, SELECTED_SEED, SELECTED_RESOLUTION, SELECTED_SCALE, SELECTED_MESH_MODE) }
// Self-contained voxel rock generator. Compile with rustc --edition=2021 rock_generator.rs.
// RECIPE is exported data interpreted by this runtime, not specialized compiled geometry.

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MeshMode { Voxel, Greedy, SurfaceNets, SurfaceNetsCoarse }
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Family { Boulder, Layered, Shard }
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Kind { Mass, Cut, Chip, Layer, Noise, Block, Strata, Wedge, Fracture }
#[derive(Clone, Copy, Debug)]
pub struct Op { pub kind:Kind, pub x:f64, pub y:f64, pub z:f64, pub size:f64, pub stretch:[f64;3], pub angle:f64 }
#[derive(Clone, Copy, Debug)]
pub struct Recipe { pub version:u8, pub family:Family, pub elongation:f64, pub erosion:f64, pub hue:f64, pub operations:&'static [Op] }
pub struct Voxels { pub resolution:usize, pub cells:Vec<u8>, pub palette:Vec<[f64;3]>, pub discarded_fraction:f64 }
pub struct Texture { pub width:usize, pub height:usize, pub pixels:Vec<u8> }
pub struct Rock { pub mesh_mode:MeshMode, pub voxels:Voxels, pub positions:Vec<f32>, pub normals:Vec<f32>, pub colors:Vec<f32>, pub uvs:Vec<f32>, pub indices:Vec<u32>, pub bounding_box:[[f64;3];2], pub texture:Texture }
struct Rng { state:u32 }
impl Rng { fn next(&mut self)->f64 { self.state=self.state.wrapping_add(0x6D2B79F5);let a=self.state;let mut t=(a^(a>>15)).wrapping_mul(1|a);t^=t.wrapping_add((t^(t>>7)).wrapping_mul(61|t));((t^(t>>14)) as f64)/4294967296.0 } }
pub fn validate(r:&Recipe)->Result<(),String>{
 if !(r.version==1||r.version==2)||!r.elongation.is_finite()||!(0.6..=1.5).contains(&r.elongation)||!r.erosion.is_finite()||!(0.0..=1.0).contains(&r.erosion)||!r.hue.is_finite()||!(0.0..=1.0).contains(&r.hue)||r.operations.is_empty()||r.operations.len()>12{return Err("Invalid recipe".into());}
 for o in r.operations {if ![o.x,o.y,o.z,o.size,o.angle].iter().all(|x|x.is_finite())||o.x.abs().max(o.y.abs()).max(o.z.abs())>1.0||!(0.05..=1.0).contains(&o.size)||o.angle.abs()>std::f64::consts::PI||!o.stretch.iter().all(|x|x.is_finite()&&(0.08..=2.0).contains(x))||r.version==1&&matches!(o.kind,Kind::Block|Kind::Strata|Kind::Wedge|Kind::Fracture){return Err("Invalid operation".into());}}
 Ok(())
}
fn block(x:f64,y:f64,z:f64,size:f64,s:[f64;3],angle:f64)->f64 {
 let a=((x*angle.cos()-z*angle.sin())/(size*s[0])).abs();let b=(y/(size*s[1])).abs();let c=((x*angle.sin()+z*angle.cos())/(size*s[2])).abs();
 (a.max(b).max(c).max((a+b+c)/2.4).max((a+b)/1.8).max((a+c)/1.8).max((b+c)/1.8)-1.0)*size
}
const DIRS:[[i32;3];6]=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
pub fn sample_voxels(recipe:&Recipe,seed:u32,n:usize)->Result<Voxels,String>{
 validate(recipe)?;if !(12..=48).contains(&n){return Err("Resolution must be 12-48".into());}
 let legacy=recipe.version==1;let mut rand=Rng{state:seed};
 let sx=if legacy{0.86+rand.next()*0.25}else{0.94+rand.next()*0.12};let sy=if legacy{0.85+rand.next()*0.3}else{0.91+rand.next()*0.18};let sz=if legacy{0.85+rand.next()*0.3}else{0.94+rand.next()*0.12};
 let angle=(rand.next()-0.5)*if legacy{0.7}else{0.18};let shift=rand.next()*8.0;
 let ops:Vec<Op>=recipe.operations.iter().map(|o|Op{x:o.x+(rand.next()-0.5)*if legacy{0.24}else{0.055},y:o.y+(rand.next()-0.5)*if legacy{0.2}else{0.04},z:o.z+(rand.next()-0.5)*if legacy{0.24}else{0.055},size:o.size*if legacy{0.84+rand.next()*0.3}else{0.96+rand.next()*0.08},..*o}).collect();
 let mut cells=vec![0u8;n*n*n];let shade=80.0+recipe.hue*65.0;
 for z in 0..n {for y in 0..n {for x in 0..n {
 let mut px=((x as f64+0.5)/n as f64*2.0-1.0)/sx;let mut py=((y as f64+0.5)/n as f64*2.0-1.0)/sy;let mut pz=((z as f64+0.5)/n as f64*2.0-1.0)/sz;
 let xx=px*angle.cos()-pz*angle.sin();pz=px*angle.sin()+pz*angle.cos();px=xx/recipe.elongation;
 if legacy {if recipe.family==Family::Layered{py/=0.43;}if recipe.family==Family::Shard{px/=0.68;py/=1.12;}}
 let mut d=10.0f64;
 for o in &ops {let dx=px-o.x;let dy=py-o.y;let dz=pz-o.z;
 match o.kind {
 Kind::Mass=>d=d.min((dx*dx+dy*dy+dz*dz).sqrt()-o.size),
 Kind::Cut=>{let len=o.x.hypot(o.y).hypot(o.z);d=d.max((px*o.x+py*o.y+pz*o.z)/if len==0.0{1.0}else{len}-o.size);},
 Kind::Chip=>d=d.max(o.size-dx.hypot(dy).hypot(dz)),
 Kind::Layer=>d+=( (py+px*0.25)*18.0+shift).sin()*o.size*0.12,
 Kind::Noise=>d+=(px*17.0+shift).sin()*(py*13.0-shift).sin()*(pz*19.0).cos()*o.size*0.08,
 Kind::Block=>d=d.min(block(dx,dy,dz,o.size,o.stretch,o.angle)),
 Kind::Wedge=>{let q=block(dx,dy,dz,o.size,o.stretch,o.angle);d=d.min(q.max(dx*0.85+dy-o.size*o.stretch[1]+0.05));},
 Kind::Strata=>{for j in 0..5 {let j=j as f64;let level=(j-2.0)*o.size*o.stretch[1]*0.36;let offset=(j*2.3+shift*0.18).sin()*o.size*0.14;let s=o.size*(1.0-j*0.055);let thickness=o.size*o.stretch[1]*0.22;d=d.min(block(dx-offset,dy-dx*o.angle-level,dz-(j*1.7+shift*0.12).cos()*0.035,s,[o.stretch[0],thickness/s,o.stretch[2]],o.angle));}},
 Kind::Fracture=>{if py>o.y&&pz>o.z{d=d.max(o.size*0.26-(dx-(py-o.y)*0.12).abs());}}
 }}
 d+=recipe.erosion*0.025*(px*29.0+shift).sin()*(pz*23.0+py*11.0).cos();
 if d<0.0 {cells[x+n*(y+n*z)]=if legacy{(1.0+(((py+1.0)*9.0).floor()+(px*3.0).floor()+30.0)%3.0) as u8}else{
 let vein=(px*11.0+py*6.0+pz*4.0+shift*0.15).sin()+0.24*(pz*21.0-py*7.0).sin();let band=if recipe.family==Family::Layered{((py-px*0.04)*43.0).sin()}else{(px*9.0+pz*7.0).sin()*(py*8.0-px*3.0).cos()};if vein.abs()<0.12{4}else if band>0.45{2}else if band< -0.4{3}else{1}};}
 }}}
 let raw_count=cells.iter().filter(|x|**x!=0).count();let mut seen=vec![false;cells.len()];let mut largest=Vec::new();
 for i in 0..cells.len(){if cells[i]==0||seen[i]{continue;}let mut queue=vec![i];seen[i]=true;let mut j=0;while j<queue.len(){let t=queue[j];let a=(t%n) as i32;let b=((t/n)%n) as i32;let c=(t/n/n) as i32;for [dx,dy,dz] in DIRS{let x=a+dx;let y=b+dy;let z=c+dz;if x>=0&&y>=0&&z>=0&&x<n as i32&&y<n as i32&&z<n as i32{let u=x as usize+n*(y as usize+n*z as usize);if cells[u]!=0&&!seen[u]{seen[u]=true;queue.push(u);}}}j+=1;}if queue.len()>largest.len(){largest=queue;}}
 let discarded_fraction=if raw_count>0{1.0-largest.len() as f64/raw_count as f64}else{0.0};let mut kept=vec![0u8;cells.len()];for i in largest{kept[i]=cells[i];}
 let palette=if legacy{vec![[0.0;3],[shade,shade*0.99,shade*0.91],[shade+12.0,shade+10.0,shade+3.0],[shade-10.0,shade-9.0,shade-13.0]]}else{match recipe.family{
 Family::Shard=>vec![[0.0;3],[80.0,88.0,99.0],[92.0,101.0,113.0],[70.0,77.0,88.0],[116.0,139.0,153.0]],
 Family::Layered=>vec![[0.0;3],[119.0,114.0,104.0],[133.0,127.0,115.0],[105.0,102.0,96.0],[156.0,119.0,76.0]],
 Family::Boulder=>vec![[0.0;3],[133.0,130.0,119.0],[145.0,141.0,130.0],[118.0,117.0,109.0],[170.0,128.0,73.0]]}};
 Ok(Voxels{resolution:n,cells:kept,palette,discarded_fraction})
}
fn texture_hash(x:u32,y:u32,seed:u32)->u32{let mut h=x.wrapping_add(seed).wrapping_mul(374761393)^y.wrapping_mul(668265263);h=(h^(h>>13)).wrapping_mul(1274126177);h^(h>>16)}
pub fn stone_texture(family:Family,seed:u32,size:usize)->Result<Texture,String>{
 if !(16..=512).contains(&size){return Err("Texture size must be 16-512".into());}let mut pixels=vec![0u8;size*size*4];
 for y in 0..size{for x in 0..size{let grain=texture_hash(x as u32,y as u32,seed)%45;let patch=texture_hash((x>>3) as u32,(y>>3) as u32,seed)%30;let vein=(x as u32*3+y as u32+texture_hash((y>>3) as u32,7,seed)%13)%47;let dark=if vein<2{38}else{0};let base=183+grain-patch-dark;let i=(x+size*y)*4;pixels[i]=base as u8;pixels[i+1]=(base-if family==Family::Layered&&vein<4{13}else{0}) as u8;pixels[i+2]=(base-if family==Family::Boulder&&vein<4{20}else{0}) as u8;pixels[i+3]=255;}}
 Ok(Texture{width:size,height:size,pixels})
}
const CORNERS:[[[usize;3];4];6]=[
 [[1,0,0],[1,1,0],[1,1,1],[1,0,1]],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],
 [[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
 [[1,0,1],[1,1,1],[0,1,1],[0,0,1]],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]];

type Geometry=(Vec<f32>,Vec<f32>,Vec<f32>,Vec<f32>,Vec<u32>,[[f64;3];2]);
// Same six face directions, material mask, width-first rectangle growth and winding as TypeScript.
fn mesh_greedy(v:&Voxels,scale:f64)->Geometry {
 let n=v.resolution;let mut p=Vec::new();let mut normals=Vec::new();let mut colors=Vec::new();let mut uvs=Vec::new();let mut indices=Vec::new();let mut lo=[f64::INFINITY;3];let mut hi=[f64::NEG_INFINITY;3];let mut mask=vec![0u8;n*n];
 for face in 0..6 {let axis=face>>1;let u=(axis+1)%3;let w=(axis+2)%3;let positive=face%2==0;
 for slice in 0..n {mask.fill(0);
 for j in 0..n{for i in 0..n{let mut q=[0usize;3];q[axis]=slice;q[u]=i;q[w]=j;let material=v.cells[q[0]+n*(q[1]+n*q[2])];if material==0{continue;}
 let adjacent=if positive{slice as i32+1}else{slice as i32-1};if adjacent>=0&&adjacent<n as i32{q[axis]=adjacent as usize;if v.cells[q[0]+n*(q[1]+n*q[2])]!=0{continue;}}mask[i+n*j]=material;}}
 for j in 0..n {let mut i=0;while i<n {let material=mask[i+n*j];if material==0{i+=1;continue;}
 let mut width=1;let mut height=1;while i+width<n&&mask[i+width+n*j]==material{width+=1;}
 'grow:while j+height<n{for k in 0..width{if mask[i+k+n*(j+height)]!=material{break 'grow;}}height+=1;}
 let mut origin=[0usize;3];origin[axis]=slice+if positive{1}else{0};origin[u]=i;origin[w]=j;
 let mut corners=[origin;4];corners[1][u]+=width;corners[2][u]+=width;corners[2][w]+=height;corners[3][w]+=height;
 let order=if positive{[0,1,2,3]}else{[0,3,2,1]};let start=(p.len()/3) as u32;
 for k in order{let q=corners[k];for d in 0..3{let pos=(q[d] as f64/n as f64-0.5)*scale;p.push(pos as f32);lo[d]=lo[d].min(pos);hi[d]=hi[d].max(pos);normals.push(if d==axis{if positive{1.0}else{-1.0}}else{0.0});colors.push((v.palette[material as usize][d]/255.0) as f32);}
 uvs.push((q[if face<2{2}else{0}] as f64/n as f64) as f32);uvs.push((q[if face<2{1}else if face<4{2}else{1}] as f64/n as f64) as f32);}
 indices.extend_from_slice(&[start,start+1,start+2,start,start+2,start+3]);
 for y in 0..height{for x in 0..width{mask[i+x+n*(j+y)]=0;}}i+=width;
 }}}
 }(p,normals,colors,uvs,indices,[lo,hi])
}

#[derive(Clone)]
struct SurfaceQuad { vertices:[usize;4], material:u8, axis:usize }
fn mesh_surface(v:&Voxels,scale:f64,coarse:bool)->Result<Geometry,String>{
 let original=v.resolution;let n=if coarse{(original+1)/2}else{original};let side=n+2;let mut grid=vec![0u8;side*side*side];
 for z in 0..n{for y in 0..n{for x in 0..n{let mut counts=vec![0usize;v.palette.len()];let mut total=0;let mut occupied=0;
 for c in z*original/n..(z+1)*original/n{for b in y*original/n..(y+1)*original/n{for a in x*original/n..(x+1)*original/n{let value=v.cells[a+original*(b+original*c)];total+=1;if value!=0{occupied+=1;counts[value as usize]+=1;}}}}
 if occupied>0&&occupied*4>=total{let mut material=1;for i in 2..counts.len(){if counts[i]>counts[material]{material=i;}}grid[(x+1)+side*((y+1)+side*(z+1))]=material as u8;}
 }}}
 if coarse&&grid.iter().all(|a|*a==0)&&v.cells.iter().any(|a|*a!=0){return mesh_surface(v,scale,false);}
 let stride=[1,side,side*side];let mut changed=true;
 while changed{changed=false;for d in 0..3{let u=(d+1)%3;let w=(d+2)%3;for k in 0..side{for j in 0..side-1{for i in 0..side-1{let mut p=[0usize;3];p[d]=k;p[u]=i;p[w]=j;let a=p[0]+side*(p[1]+side*p[2]);let b=a+stride[u];let c=b+stride[w];let e=a+stride[w];if (grid[a]!=0)==(grid[c]!=0)&&(grid[b]!=0)==(grid[e]!=0)&&(grid[a]!=0)!=(grid[b]!=0){let destination=if grid[a]!=0{b}else{a};grid[destination]=if grid[a]!=0{grid[a]}else{grid[b]};changed=true;}}}}}}
 let at=|x:usize,y:usize,z:usize|grid[x+side*(y+side*z)];let cells=n+1;let mut ids=vec![-1i32;cells*cells*cells];let mut points:Vec<[f64;3]>=Vec::new();let mut origins=Vec::new();
 for z in 0..cells{for y in 0..cells{for x in 0..cells{let mut values=[false;8];for i in 0..8{values[i]=at(x+(i&1),y+((i>>1)&1),z+((i>>2)&1))!=0;}if values.iter().all(|a|*a)||values.iter().all(|a|!*a){continue;}let mut sum=[0.0;3];let mut count=0;
 for d in 0..3{for i in 0..8{if i&(1<<d)!=0{continue;}let j=i|(1<<d);if values[i]==values[j]{continue;}for k in 0..3{sum[k]+=(((i>>k)&1)+((j>>k)&1)) as f64*0.5;}count+=1;}}
 ids[x+cells*(y+cells*z)]=points.len() as i32;points.push([x as f64+sum[0]/count as f64,y as f64+sum[1]/count as f64,z as f64+sum[2]/count as f64]);origins.push([x,y,z]);
 }}}
 let mut quads:Vec<SurfaceQuad>=Vec::new();let mut neighbors:Vec<Vec<usize>>=vec![Vec::new();points.len()];
 for axis in 0..3{let u=(axis+1)%3;let w=(axis+2)%3;for k in 0..=n{for j in 1..=n{for i in 1..=n{let mut p=[0usize;3];p[axis]=k;p[u]=i;p[w]=j;let a=at(p[0],p[1],p[2]);p[axis]+=1;let b=at(p[0],p[1],p[2]);p[axis]-=1;if (a!=0)==(b!=0){continue;}
 let mut q=[p;4];q[0][u]-=1;q[0][w]-=1;q[1][w]-=1;q[3][u]-=1;let order=if a!=0{[0,1,2,3]}else{[0,3,2,1]};let mut vertices=[0usize;4];for t in 0..4{let p=q[order[t]];let id=ids[p[0]+cells*(p[1]+cells*p[2])];if id<0{return Err("Incomplete surface net".into());}vertices[t]=id as usize;}
 quads.push(SurfaceQuad{vertices,material:if a!=0{a}else{b},axis});for t in 0..4{let x=vertices[t];let y=vertices[(t+1)%4];if !neighbors[x].contains(&y){neighbors[x].push(y);}if !neighbors[y].contains(&x){neighbors[y].push(x);}}
 }}}}
 let mut relaxed=points;
 for _ in 0..2{let mut next=relaxed.clone();for i in 0..relaxed.len(){let linked=&neighbors[i];if linked.is_empty(){continue;}for d in 0..3{let mut sum=0.0;for j in linked{sum+=relaxed[*j][d];}let value=relaxed[i][d]+0.35*(sum/linked.len() as f64-relaxed[i][d]);next[i][d]=(origins[i][d] as f64+0.05).max((origins[i][d] as f64+0.95).min(value));}}relaxed=next;}
 let mut positions=Vec::new();let mut normals=Vec::new();let mut colors=Vec::new();let mut uvs=Vec::new();let mut indices=Vec::new();let mut lo=[f64::INFINITY;3];let mut hi=[f64::NEG_INFINITY;3];
 for quad in quads{for triangle in [[0,1,2],[0,2,3]]{let mut coords=[[0.0;3];3];for i in 0..3{for d in 0..3{coords[i][d]=((relaxed[quad.vertices[triangle[i]]][d]-0.5)/n as f64-0.5)*scale;}}let mut ab=[0.0;3];let mut ac=[0.0;3];for d in 0..3{ab[d]=coords[1][d]-coords[0][d];ac[d]=coords[2][d]-coords[0][d];}let normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];let length=(normal[0]*normal[0]+normal[1]*normal[1]+normal[2]*normal[2]).sqrt();if length<1e-12{return Err("Degenerate surface triangle".into());}
 for p in coords{indices.push((positions.len()/3) as u32);for d in 0..3{positions.push(p[d] as f32);normals.push((normal[d]/length) as f32);colors.push((v.palette[quad.material as usize][d]/255.0) as f32);lo[d]=lo[d].min(p[d]);hi[d]=hi[d].max(p[d]);}uvs.push((p[if quad.axis==0{2}else{0}]/scale+0.5) as f32);uvs.push((p[if quad.axis==1{2}else{1}]/scale+0.5) as f32);}
 }}
 Ok((positions,normals,colors,uvs,indices,[lo,hi]))
}

pub fn generate_rock(recipe:&Recipe,seed:u32,resolution:usize,scale:f64)->Result<Rock,String>{generate_rock_with_mode(recipe,seed,resolution,scale,MeshMode::Voxel)}
pub fn generate_rock_with_mode(recipe:&Recipe,seed:u32,resolution:usize,scale:f64,mesh_mode:MeshMode)->Result<Rock,String>{
 if !scale.is_finite()||scale<=0.0{return Err("Invalid scale".into());}let v=sample_voxels(recipe,seed,resolution)?;let n=v.resolution;
 let mut p=Vec::new();let mut normals=Vec::new();let mut colors=Vec::new();let mut uvs=Vec::new();let mut indices=Vec::new();let mut lo=[f64::INFINITY;3];let mut hi=[f64::NEG_INFINITY;3];
 if mesh_mode==MeshMode::Voxel {for z in 0..n{for y in 0..n{for x in 0..n{let value=v.cells[x+n*(y+n*z)] as usize;if value==0{continue;}for f in 0..6{let [dx,dy,dz]=DIRS[f];let a=x as i32+dx;let b=y as i32+dy;let e=z as i32+dz;if a>=0&&b>=0&&e>=0&&a<n as i32&&b<n as i32&&e<n as i32&&v.cells[a as usize+n*(b as usize+n*e as usize)]!=0{continue;}let start=(p.len()/3) as u32;
 for q in CORNERS[f]{let coord=[x+q[0],y+q[1],z+q[2]];for k in 0..3{let pos=(coord[k] as f64/n as f64-0.5)*scale;p.push(pos as f32);lo[k]=lo[k].min(pos);hi[k]=hi[k].max(pos);colors.push((v.palette[value][k]/255.0) as f32);}normals.extend_from_slice(&[dx as f32,dy as f32,dz as f32]);uvs.push((coord[if f<2{2}else{0}] as f64/n as f64) as f32);uvs.push((coord[if f<2{1}else if f<4{2}else{1}] as f64/n as f64) as f32);}
 indices.extend_from_slice(&[start,start+1,start+2,start,start+2,start+3]);}}}}
 } else {let result=if mesh_mode==MeshMode::Greedy{mesh_greedy(&v,scale)}else{mesh_surface(&v,scale,mesh_mode==MeshMode::SurfaceNetsCoarse)?};p=result.0;normals=result.1;colors=result.2;uvs=result.3;indices=result.4;lo=result.5[0];hi=result.5[1];}
 Ok(Rock{mesh_mode,voxels:v,positions:p,normals,colors,uvs,indices,bounding_box:[lo,hi],texture:stone_texture(recipe.family,seed,128)?})
}
pub const RECIPE: Recipe = Recipe { version: 2, family: Family::Shard, elongation: 1.001100815627724, erosion: 0.19281249878695236, hue: 0.45, operations: &[
    Op { kind: Kind::Wedge, x: -0.33, y: 0.006983676394447684, z: -0.007138023320585489, size: 0.6693804149795324, stretch: [0.33, 1.0, 0.4178115684725344], angle: -0.14 },
    Op { kind: Kind::Wedge, x: -0.05632775485515595, y: -0.14, z: 0.03, size: 0.5, stretch: [0.38, 1.0, 0.55], angle: -0.12 },
    Op { kind: Kind::Wedge, x: 0.11, y: -0.26, z: 0.04, size: 0.37, stretch: [0.5, 1.0, 0.68], angle: -0.11 },
    Op { kind: Kind::Block, x: 0.14546858503483234, y: -0.54, z: 0.0, size: 0.5, stretch: [1.0, 0.2, 0.839194218358025], angle: -0.1 },
    Op { kind: Kind::Cut, x: 0.19229003936052325, y: 0.1484670734265819, z: 0.22578224181197581, size: 0.20455349054420366, stretch: [1.0, 1.0, 1.0], angle: 0.0 },
    Op { kind: Kind::Noise, x: 0.06721247155219316, y: 0.2015373463043943, z: -0.10091784093528985, size: 0.21058157177641987, stretch: [1.0, 1.0, 1.0], angle: 0.0 }
] };
pub fn rock(seed:u32,resolution:usize)->Result<Rock,String>{generate_rock_with_mode(&RECIPE,seed,resolution,1.0,SELECTED_MESH_MODE)}
fn checksum(bytes:impl IntoIterator<Item=u8>)->u32{bytes.into_iter().fold(2166136261u32,|h,b|(h^b as u32).wrapping_mul(16777619))}
fn main(){let args:Vec<String>=std::env::args().collect();let seed=args.get(1).and_then(|s|s.parse().ok()).unwrap_or(SELECTED_SEED);let n=args.get(2).and_then(|s|s.parse().ok()).unwrap_or(SELECTED_RESOLUTION);let scale=args.get(3).and_then(|s|s.parse().ok()).unwrap_or(SELECTED_SCALE);let mesh_mode=match args.get(4).map(|s|s.as_str()){Some("voxel")=>MeshMode::Voxel,Some("lowpoly")=>MeshMode::Greedy,Some("smooth")=>MeshMode::SurfaceNets,Some("smooth-coarse")=>MeshMode::SurfaceNetsCoarse,_=>SELECTED_MESH_MODE};match generate_rock_with_mode(&RECIPE,seed,n,scale,mesh_mode){Ok(r)=>println!("{{\"cellsHash\":{},\"textureHash\":{},\"vertices\":{},\"indices\":{},\"positionsHash\":{},\"normalsHash\":{},\"colorsHash\":{},\"uvsHash\":{},\"indicesHash\":{}}}",checksum(r.voxels.cells.iter().copied()),checksum(r.texture.pixels.iter().copied()),r.positions.len()/3,r.indices.len(),checksum(r.positions.iter().flat_map(|v|v.to_le_bytes())),checksum(r.normals.iter().flat_map(|v|v.to_le_bytes())),checksum(r.colors.iter().flat_map(|v|v.to_le_bytes())),checksum(r.uvs.iter().flat_map(|v|v.to_le_bytes())),checksum(r.indices.iter().flat_map(|v|v.to_le_bytes()))),Err(e)=>{eprintln!("{e}");std::process::exit(1);}}}
