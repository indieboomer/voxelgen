// Selected preview: seed 42, resolution 28, scale 1, mesh voxel.
// RECIPE generates all four previews and other seeds; selected_rock() reproduces the selected model.
pub const SELECTED_SEED: u32 = 42;
pub const SELECTED_RESOLUTION: usize = 28;
pub const SELECTED_SCALE: f64 = 1.0;
pub const SELECTED_MESH_MODE: MeshMode = MeshMode::Voxel;
pub const SELECTED_TEXTURE_STYLE: TextureStyle = TextureStyle::Natural;
pub fn selected_rock() -> Result<Rock,String> { generate_rock_styled(&RECIPE, SELECTED_SEED, SELECTED_RESOLUTION, SELECTED_SCALE, SELECTED_MESH_MODE, SELECTED_TEXTURE_STYLE) }
// Self-contained voxel rock generator. Compile with rustc --edition=2021 rock_generator.rs.
// RECIPE is exported data interpreted by this runtime, not specialized compiled geometry.

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TextureStyle { Natural, Minecraft, Valheim, Tiny, Flat }
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MeshMode { Voxel, Greedy, SurfaceNets, SurfaceNetsCoarse, SuperLow }
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Family { Boulder, Layered, Shard, Tree, Bush }
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Kind { Mass, Cut, Chip, Layer, Noise, Block, Strata, Wedge, Fracture, Trunk, Branch, Foliage }
#[derive(Clone, Copy, Debug)]
pub struct Op { pub kind:Kind, pub x:f64, pub y:f64, pub z:f64, pub size:f64, pub stretch:[f64;3], pub angle:f64, pub end:[f64;3] }
#[derive(Clone, Copy, Debug)]
pub struct Recipe { pub version:u8, pub family:Family, pub elongation:f64, pub erosion:f64, pub hue:f64, pub operations:&'static [Op] }
pub struct Voxels { pub resolution:usize, pub cells:Vec<u8>, pub palette:Vec<[f64;3]>, pub discarded_fraction:f64 }
pub struct Texture { pub width:usize, pub height:usize, pub pixels:Vec<u8> }
pub struct Rock { pub mesh_mode:MeshMode, pub voxels:Voxels, pub positions:Vec<f32>, pub normals:Vec<f32>, pub colors:Vec<f32>, pub uvs:Vec<f32>, pub indices:Vec<u32>, pub bounding_box:[[f64;3];2], pub texture:Texture }
struct Rng { state:u32 }
impl Rng { fn next(&mut self)->f64 { self.state=self.state.wrapping_add(0x6D2B79F5);let a=self.state;let mut t=(a^(a>>15)).wrapping_mul(1|a);t^=t.wrapping_add((t^(t>>7)).wrapping_mul(61|t));((t^(t>>14)) as f64)/4294967296.0 } }
pub fn validate(r:&Recipe)->Result<(),String>{
 if !(r.version==1||r.version==2||r.version==3)||matches!(r.family,Family::Tree|Family::Bush)&&r.version!=3||!r.elongation.is_finite()||!(0.6..=1.5).contains(&r.elongation)||!r.erosion.is_finite()||!(0.0..=1.0).contains(&r.erosion)||!r.hue.is_finite()||!(0.0..=1.0).contains(&r.hue)||r.operations.is_empty()||r.operations.len()>12{return Err("Invalid recipe".into());}
 for o in r.operations {if r.version<3&&matches!(o.kind,Kind::Trunk|Kind::Branch|Kind::Foliage)||!o.end.iter().all(|x|x.is_finite()&&x.abs()<=1.0)||![o.x,o.y,o.z,o.size,o.angle].iter().all(|x|x.is_finite())||o.x.abs().max(o.y.abs()).max(o.z.abs())>1.0||!(0.05..=1.0).contains(&o.size)||o.angle.abs()>std::f64::consts::PI||!o.stretch.iter().all(|x|x.is_finite()&&(0.08..=2.0).contains(x))||r.version==1&&matches!(o.kind,Kind::Block|Kind::Strata|Kind::Wedge|Kind::Fracture){return Err("Invalid operation".into());}}
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
 let mut d=10.0f64;let mut plant_material=2;
 for o in &ops {let dx=px-o.x;let dy=py-o.y;let dz=pz-o.z;let previous=d;
 match o.kind {
 Kind::Trunk=>d=d.min((dx.hypot(dz)-o.size*o.stretch[0]*(1.0-0.2*dy/(o.size*o.stretch[1]))).max(dy.abs()-o.size*o.stretch[1])),
 Kind::Foliage=>d=d.min(((dx/o.stretch[0]).powi(2)+(dy/o.stretch[1]).powi(2)+(dz/o.stretch[2]).powi(2)).sqrt()-o.size+(px*17.0+shift).sin()*(py*13.0-pz*11.0).cos()*o.size*0.06),
 Kind::Branch=>{let vx=o.end[0]-o.x;let vy=o.end[1]-o.y;let vz=o.end[2]-o.z;let den=vx*vx+vy*vy+vz*vz;let t=((dx*vx+dy*vy+dz*vz)/if den==0.0{1.0}else{den}).clamp(0.0,1.0);d=d.min((dx-t*vx).hypot(dy-t*vy).hypot(dz-t*vz)-o.size);},
 Kind::Mass=>d=d.min((dx*dx+dy*dy+dz*dz).sqrt()-o.size),
 Kind::Cut=>{let len=o.x.hypot(o.y).hypot(o.z);d=d.max((px*o.x+py*o.y+pz*o.z)/if len==0.0{1.0}else{len}-o.size);},
 Kind::Chip=>d=d.max(o.size-dx.hypot(dy).hypot(dz)),
 Kind::Layer=>d+=( (py+px*0.25)*18.0+shift).sin()*o.size*0.12,
 Kind::Noise=>d+=(px*17.0+shift).sin()*(py*13.0-shift).sin()*(pz*19.0).cos()*o.size*0.08,
 Kind::Block=>d=d.min(block(dx,dy,dz,o.size,o.stretch,o.angle)),
 Kind::Wedge=>{let q=block(dx,dy,dz,o.size,o.stretch,o.angle);d=d.min(q.max(dx*0.85+dy-o.size*o.stretch[1]+0.05));},
 Kind::Strata=>{for j in 0..5 {let j=j as f64;let level=(j-2.0)*o.size*o.stretch[1]*0.36;let offset=(j*2.3+shift*0.18).sin()*o.size*0.14;let s=o.size*(1.0-j*0.055);let thickness=o.size*o.stretch[1]*0.22;d=d.min(block(dx-offset,dy-dx*o.angle-level,dz-(j*1.7+shift*0.12).cos()*0.035,s,[o.stretch[0],thickness/s,o.stretch[2]],o.angle));}},
 Kind::Fracture=>{if py>o.y&&pz>o.z{d=d.max(o.size*0.26-(dx-(py-o.y)*0.12).abs());}}
 } if recipe.version==3&&d<previous&&!matches!(o.kind,Kind::Noise|Kind::Layer){plant_material=if matches!(o.kind,Kind::Trunk|Kind::Branch){1}else{2};}}
 d+=recipe.erosion*0.025*(px*29.0+shift).sin()*(pz*23.0+py*11.0).cos();
 if d<0.0 {cells[x+n*(y+n*z)]=if matches!(recipe.family,Family::Tree|Family::Bush){let detail=(px*13.0+pz*11.0+shift).sin()*(py*17.0-px*7.0).cos();if plant_material==1{1}else if detail< -0.3{2}else if detail>0.45{4}else{3}}else if legacy{(1.0+(((py+1.0)*9.0).floor()+(px*3.0).floor()+30.0)%3.0) as u8}else{
 let vein=(px*11.0+py*6.0+pz*4.0+shift*0.15).sin()+0.24*(pz*21.0-py*7.0).sin();let band=if recipe.family==Family::Layered{((py-px*0.04)*43.0).sin()}else{(px*9.0+pz*7.0).sin()*(py*8.0-px*3.0).cos()};if vein.abs()<0.12{4}else if band>0.45{2}else if band< -0.4{3}else{1}};}
 }}}
 let raw_count=cells.iter().filter(|x|**x!=0).count();let mut seen=vec![false;cells.len()];let mut largest=Vec::new();
 for i in 0..cells.len(){if cells[i]==0||seen[i]{continue;}let mut queue=vec![i];seen[i]=true;let mut j=0;while j<queue.len(){let t=queue[j];let a=(t%n) as i32;let b=((t/n)%n) as i32;let c=(t/n/n) as i32;for [dx,dy,dz] in DIRS{let x=a+dx;let y=b+dy;let z=c+dz;if x>=0&&y>=0&&z>=0&&x<n as i32&&y<n as i32&&z<n as i32{let u=x as usize+n*(y as usize+n*z as usize);if cells[u]!=0&&!seen[u]{seen[u]=true;queue.push(u);}}}j+=1;}if queue.len()>largest.len(){largest=queue;}}
 let discarded_fraction=if raw_count>0{1.0-largest.len() as f64/raw_count as f64}else{0.0};let mut kept=vec![0u8;cells.len()];for i in largest{kept[i]=cells[i];}
 let palette=if legacy{vec![[0.0;3],[shade,shade*0.99,shade*0.91],[shade+12.0,shade+10.0,shade+3.0],[shade-10.0,shade-9.0,shade-13.0]]}else{match recipe.family{
 Family::Tree=>vec![[0.0;3],[112.0,73.0,40.0],[38.0,76.0,32.0],[63.0,112.0,41.0],[99.0,142.0,54.0]],
 Family::Bush=>vec![[0.0;3],[105.0,70.0,38.0],[37.0,77.0,37.0],[63.0,116.0,50.0],[110.0,148.0,66.0]],
 Family::Shard=>vec![[0.0;3],[80.0,88.0,99.0],[92.0,101.0,113.0],[70.0,77.0,88.0],[116.0,139.0,153.0]],
 Family::Layered=>vec![[0.0;3],[119.0,114.0,104.0],[133.0,127.0,115.0],[105.0,102.0,96.0],[156.0,119.0,76.0]],
 Family::Boulder=>vec![[0.0;3],[133.0,130.0,119.0],[145.0,141.0,130.0],[118.0,117.0,109.0],[170.0,128.0,73.0]]}};
 Ok(Voxels{resolution:n,cells:kept,palette,discarded_fraction})
}
fn texture_hash(x:u32,y:u32,seed:u32)->u32{let mut h=x.wrapping_add(seed).wrapping_mul(374761393)^y.wrapping_mul(668265263);h=(h^(h>>13)).wrapping_mul(1274126177);h^(h>>16)}
pub fn stone_texture(family:Family,seed:u32,size:usize)->Result<Texture,String>{
 if !(16..=512).contains(&size){return Err("Texture size must be 16-512".into());}let mut pixels=vec![0u8;size*size*4];
 for y in 0..size{for x in 0..size{let grain=texture_hash(x as u32,y as u32,seed)%45;let patch=texture_hash((x>>3) as u32,(y>>3) as u32,seed)%30;let vein=(x as u32*3+y as u32+texture_hash((y>>3) as u32,7,seed)%13)%47;let vegetation=matches!(family,Family::Tree|Family::Bush);let dark=if vein<2{if vegetation{12}else{38}}else{0};let base=if vegetation{202+grain%32-patch%18-dark}else{183+grain-patch-dark};let i=(x+size*y)*4;pixels[i]=base as u8;pixels[i+1]=(base-if family==Family::Layered&&vein<4{13}else{0}) as u8;pixels[i+2]=(base-if family==Family::Boulder&&vein<4{20}else{0}) as u8;pixels[i+3]=255;}}
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
pub fn generate_rock_with_mode(recipe:&Recipe,seed:u32,resolution:usize,scale:f64,mesh_mode:MeshMode)->Result<Rock,String>{generate_rock_styled(recipe,seed,resolution,scale,mesh_mode,TextureStyle::Natural)}
pub fn generate_rock_styled(recipe:&Recipe,seed:u32,resolution:usize,scale:f64,mesh_mode:MeshMode,texture_style:TextureStyle)->Result<Rock,String>{
 if !scale.is_finite()||scale<=0.0{return Err("Invalid scale".into());}let v=sample_voxels(recipe,seed,resolution)?;let n=v.resolution;
 if mesh_mode==MeshMode::SuperLow{let detail=style_texture(stone_texture(recipe.family,seed,128)?,texture_style,seed);let (g,texture)=mesh_superlow(&v,scale,recipe.family,&detail)?;return Ok(finish_texture_style(Rock{mesh_mode,voxels:v,positions:g.0,normals:g.1,colors:g.2,uvs:g.3,indices:g.4,bounding_box:g.5,texture},texture_style));}
 let mut p=Vec::new();let mut normals=Vec::new();let mut colors=Vec::new();let mut uvs=Vec::new();let mut indices=Vec::new();let mut lo=[f64::INFINITY;3];let mut hi=[f64::NEG_INFINITY;3];
 if mesh_mode==MeshMode::Voxel {for z in 0..n{for y in 0..n{for x in 0..n{let value=v.cells[x+n*(y+n*z)] as usize;if value==0{continue;}for f in 0..6{let [dx,dy,dz]=DIRS[f];let a=x as i32+dx;let b=y as i32+dy;let e=z as i32+dz;if a>=0&&b>=0&&e>=0&&a<n as i32&&b<n as i32&&e<n as i32&&v.cells[a as usize+n*(b as usize+n*e as usize)]!=0{continue;}let start=(p.len()/3) as u32;
 for q in CORNERS[f]{let coord=[x+q[0],y+q[1],z+q[2]];for k in 0..3{let pos=(coord[k] as f64/n as f64-0.5)*scale;p.push(pos as f32);lo[k]=lo[k].min(pos);hi[k]=hi[k].max(pos);colors.push((v.palette[value][k]/255.0) as f32);}normals.extend_from_slice(&[dx as f32,dy as f32,dz as f32]);uvs.push((coord[if f<2{2}else{0}] as f64/n as f64) as f32);uvs.push((coord[if f<2{1}else if f<4{2}else{1}] as f64/n as f64) as f32);}
 indices.extend_from_slice(&[start,start+1,start+2,start,start+2,start+3]);}}}}
 } else {let result=if mesh_mode==MeshMode::Greedy{mesh_greedy(&v,scale)}else{mesh_surface(&v,scale,mesh_mode==MeshMode::SurfaceNetsCoarse)?};p=result.0;normals=result.1;colors=result.2;uvs=result.3;indices=result.4;lo=result.5[0];hi=result.5[1];}
 Ok(finish_texture_style(Rock{mesh_mode,voxels:v,positions:p,normals,colors,uvs,indices,bounding_box:[lo,hi],texture:style_texture(stone_texture(recipe.family,seed,128)?,texture_style,seed)},texture_style))
}
// Quadric edge contraction with manifold-link, material-border and normal guards.
fn sl_sub(a:[f64;3],b:[f64;3])->[f64;3]{[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
fn sl_dot(a:[f64;3],b:[f64;3])->f64{a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
fn sl_cross(a:[f64;3],b:[f64;3])->[f64;3]{[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
fn sl_error(q:&[f64;16],p:[f64;3])->f64{let v=[p[0],p[1],p[2],1.0];let mut e=0.0;for i in 0..4{for j in 0..4{e+=v[i]*q[i*4+j]*v[j];}}e.max(0.0)}
fn sl_round(x:f64,s:f64)->f64{(x*s+0.5).floor()/s}
fn sl_weights(p:[f64;3],a:[f64;3],b:[f64;3],c:[f64;3])->[f64;3]{
 let ab=sl_sub(b,a);let ac=sl_sub(c,a);let ap=sl_sub(p,a);let d1=sl_dot(ab,ap);let d2=sl_dot(ac,ap);if d1<=0.0&&d2<=0.0{return [1.0,0.0,0.0];}let bp=sl_sub(p,b);let d3=sl_dot(ab,bp);let d4=sl_dot(ac,bp);if d3>=0.0&&d4<=d3{return [0.0,1.0,0.0];}let vc=d1*d4-d3*d2;if vc<=0.0&&d1>=0.0&&d3<=0.0{let t=d1/(d1-d3);return [1.0-t,t,0.0];}let cp=sl_sub(p,c);let d5=sl_dot(ab,cp);let d6=sl_dot(ac,cp);if d6>=0.0&&d5<=d6{return [0.0,0.0,1.0];}let vb=d5*d2-d1*d6;if vb<=0.0&&d2>=0.0&&d6<=0.0{let t=d2/(d2-d6);return [1.0-t,0.0,t];}let va=d3*d6-d5*d4;if va<=0.0&&d4-d3>=0.0&&d5-d6>=0.0{let t=(d4-d3)/(d4-d3+d5-d6);return [0.0,1.0-t,t];}let den=1.0/(va+vb+vc);let v=vb*den;let w=vc*den;[1.0-v-w,v,w]
}
fn sl_bin(x:f64)->usize{((x+0.5)*8.0).floor().clamp(0.0,7.0) as usize}
fn sl_sample(p:[f64;3],src:&Vec<[[f64;3];3]>,bins:&Vec<Vec<usize>>,source:&Geometry,detail:&Texture)->[u8;3]{
 let q=p.map(sl_bin);let mut seen=std::collections::HashSet::new();let mut best=f64::INFINITY;let mut face=0;let mut weights=[1.0,0.0,0.0];
 for radius in 0..8{for z in q[2].saturating_sub(radius)..=(q[2]+radius).min(7){for y in q[1].saturating_sub(radius)..=(q[1]+radius).min(7){for x in q[0].saturating_sub(radius)..=(q[0]+radius).min(7){for id in &bins[x+8*(y+8*z)]{if !seen.insert(*id){continue;}let tri=src[*id];let w=sl_weights(p,tri[0],tri[1],tri[2]);let mut hit=[0.0;3];for d in 0..3{for i in 0..3{hit[d]+=w[i]*tri[i][d];}}let delta=sl_sub(p,hit);let distance=sl_dot(delta,delta);if distance<best{best=distance;face=*id;weights=w;}}}}}
 let mut bound=f64::INFINITY;for d in 0..3{if q[d]>radius{bound=bound.min(p[d]-(q[d]-radius) as f64/8.0+0.5);}if q[d]+radius<7{bound=bound.min((q[d]+radius+1) as f64/8.0-0.5-p[d]);}}if best.is_finite()&&best<=bound*bound{break;}}
 let ids=[source.4[face*3] as usize,source.4[face*3+1] as usize,source.4[face*3+2] as usize];let mut uv=[0.0;2];for d in 0..2{for i in 0..3{uv[d]+=weights[i]*source.3[ids[i]*2+d] as f64;}}let tx=(uv[0]*detail.width as f64).floor().clamp(0.0,(detail.width-1) as f64) as usize;let ty=(uv[1]*detail.height as f64).floor().clamp(0.0,(detail.height-1) as f64) as usize;let offset=(tx+detail.width*ty)*4;
 let mut rgb=[0u8;3];for d in 0..3{let color=(source.2[ids[0]*3+d] as f64*255.0+0.5).floor() as u32;rgb[d]=((color*detail.pixels[offset+d] as u32+127)/255) as u8;}rgb
}
fn mesh_superlow(v:&Voxels,scale:f64,family:Family,detail:&Texture)->Result<(Geometry,Texture),String>{
 let source=mesh_surface(v,scale,true)?;let mut positions:Vec<[f64;3]>=Vec::new();let mut lookup=std::collections::HashMap::new();let mut remap=Vec::new();
 for i in (0..source.0.len()).step_by(3){let key=[source.0[i].to_bits(),source.0[i+1].to_bits(),source.0[i+2].to_bits()];let id=if let Some(id)=lookup.get(&key){*id}else{let id=positions.len();lookup.insert(key,id);positions.push([source.0[i] as f64/scale,source.0[i+1] as f64/scale,source.0[i+2] as f64/scale]);id};remap.push(id);}
 let mut faces:Vec<[usize;3]>=source.4.chunks(3).map(|f|[remap[f[0] as usize],remap[f[1] as usize],remap[f[2] as usize]]).collect();let budget=faces.len().min(if family==Family::Tree{256}else if family==Family::Bush{192}else{160});let mut quadrics=vec![[0.0;16];positions.len()];
 for f in &faces{let normal=sl_cross(sl_sub(positions[f[1]],positions[f[0]]),sl_sub(positions[f[2]],positions[f[0]]));let length=sl_dot(normal,normal).sqrt();if length<1e-12{continue;}let mut plane=[normal[0]/length,normal[1]/length,normal[2]/length,0.0];plane[3]=-sl_dot([plane[0],plane[1],plane[2]],positions[f[0]]);for id in f{for i in 0..4{for j in 0..4{quadrics[*id][i*4+j]+=plane[i]*plane[j];}}}}
 let groups:Vec<u8>=positions.iter().map(|p|{if !matches!(family,Family::Tree|Family::Bush){return 0;}let n=v.resolution;let q=p.map(|x|((x+0.5)*n as f64).floor().clamp(0.0,(n-1) as f64) as usize);let mut best=usize::MAX;let mut value=0;for z in q[2].saturating_sub(2)..=(q[2]+2).min(n-1){for y in q[1].saturating_sub(2)..=(q[1]+2).min(n-1){for x in q[0].saturating_sub(2)..=(q[0]+2).min(n-1){let m=v.cells[x+n*(y+n*z)];if m==0{continue;}let d=x.abs_diff(q[0]).pow(2)+y.abs_diff(q[1]).pow(2)+z.abs_diff(q[2]).pow(2);if d<best{best=d;value=m;}}}}if value==1{1}else{2}}).collect();
 #[derive(Clone)]struct Candidate{a:usize,b:usize,p:[f64;3],q:[f64;16],cost:f64}
 while faces.len()>budget{
 let mut neighbors=vec![std::collections::BTreeSet::new();positions.len()];let mut incident=vec![Vec::new();positions.len()];let mut edges:std::collections::BTreeMap<(usize,usize),Vec<usize>>=std::collections::BTreeMap::new();
 for (fi,f) in faces.iter().enumerate(){for a in f{incident[*a].push(fi);}for j in 0..3{let a=f[j].min(f[(j+1)%3]);let b=f[j].max(f[(j+1)%3]);neighbors[a].insert(b);neighbors[b].insert(a);edges.entry((a,b)).or_default().push(f[(j+2)%3]);}}
 let mut candidates=Vec::new();for ((a,b),opposite) in edges{if opposite.len()!=2||groups[a]!=groups[b]{continue;}let common:Vec<usize>=neighbors[a].intersection(&neighbors[b]).copied().collect();if common.len()!=2||!opposite.iter().all(|x|common.contains(x)){continue;}
 let mut q=[0.0;16];for i in 0..16{q[i]=quadrics[a][i]+quadrics[b][i];}let pa=positions[a];let pb=positions[b];let middle=[(pa[0]+pb[0])*0.5,(pa[1]+pb[1])*0.5,(pa[2]+pb[2])*0.5];let e0=sl_error(&q,pa);let e1=sl_error(&q,pb);let em=sl_error(&q,middle);let aa=2.0*(e1+e0-2.0*em);let bb=e1-e0-aa;let t=if aa>1e-12{(-bb/(2.0*aa)).clamp(0.0,1.0)}else{0.5};let mut best=[0.0;3];let mut cost=f64::INFINITY;
 for fraction in [t,0.0,0.5,1.0]{let mut p=[0.0;3];for d in 0..3{p[d]=sl_round(pa[d]+(pb[d]-pa[d])*fraction,1e9);}let error=sl_round(sl_error(&q,p),1e12);if error<cost{best=p;cost=error;}}candidates.push(Candidate{a,b,p:best,q,cost});}
 candidates.sort_by(|a,b|a.cost.partial_cmp(&b.cost).unwrap().then(a.a.cmp(&b.a)).then(a.b.cmp(&b.b)));let mut chosen=None;
 for candidate in candidates{let mut valid=true;let mut affected=incident[candidate.a].clone();for fi in &incident[candidate.b]{if !affected.contains(fi){affected.push(*fi);}}
 for fi in affected{let f=faces[fi];if f.contains(&candidate.a)&&f.contains(&candidate.b){continue;}let before=f.map(|i|positions[i]);let after=f.map(|i|if i==candidate.a||i==candidate.b{candidate.p}else{positions[i]});let old=sl_cross(sl_sub(before[1],before[0]),sl_sub(before[2],before[0]));let next=sl_cross(sl_sub(after[1],after[0]),sl_sub(after[2],after[0]));if sl_dot(next,next)<1e-18||sl_dot(old,next)<0.25*(sl_dot(old,old)*sl_dot(next,next)).sqrt(){valid=false;break;}}if valid{chosen=Some(candidate);break;}}
 let Some(c)=chosen else{break;};positions[c.a]=c.p;quadrics[c.a]=c.q;faces=faces.iter().map(|f|f.map(|i|if i==c.b{c.a}else{i})).filter(|f|f[0]!=f[1]&&f[0]!=f[2]&&f[1]!=f[2]).collect();}
 let src:Vec<[[f64;3];3]>=source.4.chunks(3).map(|f|{let mut tri=[[0.0;3];3];for i in 0..3{for d in 0..3{tri[i][d]=source.0[f[i] as usize*3+d] as f64/scale;}}tri}).collect();let mut bins=vec![Vec::new();512];for (i,tri) in src.iter().enumerate(){let mut lo=[0;3];let mut hi=[0;3];for d in 0..3{lo[d]=sl_bin(tri[0][d].min(tri[1][d]).min(tri[2][d]));hi[d]=sl_bin(tri[0][d].max(tri[1][d]).max(tri[2][d]));}for z in lo[2]..=hi[2]{for y in lo[1]..=hi[1]{for x in lo[0]..=hi[0]{bins[x+8*(y+8*z)].push(i);}}}}
 let tile=12;let gutter=2;let columns=(faces.len() as f64).sqrt().ceil().max(1.0) as usize;let mut size=16;while size<columns*tile{size*=2;}let mut pixels=vec![0u8;size*size*4];for i in (3..pixels.len()).step_by(4){pixels[i]=255;}
 let mut out=Vec::new();let mut normals=Vec::new();let mut colors=Vec::new();let mut uvs=Vec::new();let mut indices=Vec::new();let mut lo=[f64::INFINITY;3];let mut hi=[f64::NEG_INFINITY;3];
 for (i,f) in faces.iter().enumerate(){let points=f.map(|id|positions[id]);let x=(i%columns)*tile;let y=(i/columns)*tile;let normal=sl_cross(sl_sub(points[1],points[0]),sl_sub(points[2],points[0]));let length=sl_dot(normal,normal).sqrt();
 for py in 0..tile{for px in 0..tile{let mut s=((px as f64-gutter as f64)/(tile-2*gutter) as f64).max(0.0);let mut t=((py as f64-gutter as f64)/(tile-2*gutter) as f64).max(0.0);if s+t>1.0{let total=s+t;s/=total;t/=total;}let mut p=[0.0;3];for d in 0..3{p[d]=points[0][d]*(1.0-s-t)+points[1][d]*s+points[2][d]*t;}let rgb=sl_sample(p,&src,&bins,&source,detail);let offset=(x+px+size*(y+py))*4;pixels[offset..offset+3].copy_from_slice(&rgb);}}
 let tex=[[x+gutter,y+gutter],[x+tile-gutter,y+gutter],[x+gutter,y+tile-gutter]];for j in 0..3{indices.push((out.len()/3) as u32);for d in 0..3{let p=points[j][d]*scale;out.push(p as f32);lo[d]=lo[d].min(p);hi[d]=hi[d].max(p);normals.push((normal[d]/length) as f32);colors.push(1.0);}uvs.push((tex[j][0] as f64/size as f64) as f32);uvs.push((tex[j][1] as f64/size as f64) as f32);}}
 Ok(((out,normals,colors,uvs,indices,[lo,hi]),Texture{width:size,height:size,pixels}))
}

pub const RECIPE: Recipe = Recipe { version: 2, family: Family::Shard, elongation: 1.0, erosion: 0.2, hue: 0.45, operations: &[
    Op { kind: Kind::Wedge, x: -0.33, y: -0.02, z: 0.0, size: 0.62, stretch: [0.33, 1.0, 0.5], angle: -0.14, end: [0.0, 0.0, 0.0] },
    Op { kind: Kind::Wedge, x: -0.11, y: -0.14, z: 0.03, size: 0.5, stretch: [0.38, 1.0, 0.55], angle: -0.12, end: [0.0, 0.0, 0.0] },
    Op { kind: Kind::Wedge, x: 0.11, y: -0.26, z: 0.04, size: 0.37, stretch: [0.5, 1.0, 0.68], angle: -0.11, end: [0.0, 0.0, 0.0] },
    Op { kind: Kind::Block, x: 0.09, y: -0.54, z: 0.0, size: 0.5, stretch: [1.0, 0.2, 0.8], angle: -0.1, end: [0.0, 0.0, 0.0] },
    Op { kind: Kind::Fracture, x: -0.09, y: 0.1, z: 0.12, size: 0.08, stretch: [1.0, 1.0, 1.0], angle: 0.0, end: [0.0, 0.0, 0.0] }
] };
pub fn rock(seed:u32,resolution:usize)->Result<Rock,String>{generate_rock_styled(&RECIPE,seed,resolution,1.0,SELECTED_MESH_MODE,SELECTED_TEXTURE_STYLE)}
fn checksum(bytes:impl IntoIterator<Item=u8>)->u32{bytes.into_iter().fold(2166136261u32,|h,b|(h^b as u32).wrapping_mul(16777619))}
fn main(){let args:Vec<String>=std::env::args().collect();let seed=args.get(1).and_then(|s|s.parse().ok()).unwrap_or(SELECTED_SEED);let n=args.get(2).and_then(|s|s.parse().ok()).unwrap_or(SELECTED_RESOLUTION);let scale=args.get(3).and_then(|s|s.parse().ok()).unwrap_or(SELECTED_SCALE);let mesh_mode=match args.get(4).map(|s|s.as_str()){Some("voxel")=>MeshMode::Voxel,Some("lowpoly")=>MeshMode::Greedy,Some("smooth")=>MeshMode::SurfaceNets,Some("smooth-coarse")=>MeshMode::SurfaceNetsCoarse,Some("superlow")=>MeshMode::SuperLow,_=>SELECTED_MESH_MODE};let texture_style=match args.get(5).map(|s|s.as_str()){Some("minecraft")=>TextureStyle::Minecraft,Some("valheim")=>TextureStyle::Valheim,Some("tiny")=>TextureStyle::Tiny,Some("flat")=>TextureStyle::Flat,Some("natural")=>TextureStyle::Natural,_=>SELECTED_TEXTURE_STYLE};match generate_rock_styled(&RECIPE,seed,n,scale,mesh_mode,texture_style){Ok(r)=>println!("{{\"cellsHash\":{},\"textureHash\":{},\"vertices\":{},\"indices\":{},\"positionsHash\":{},\"normalsHash\":{},\"colorsHash\":{},\"uvsHash\":{},\"indicesHash\":{}}}",checksum(r.voxels.cells.iter().copied()),checksum(r.texture.pixels.iter().copied()),r.positions.len()/3,r.indices.len(),checksum(r.positions.iter().flat_map(|v|v.to_le_bytes())),checksum(r.normals.iter().flat_map(|v|v.to_le_bytes())),checksum(r.colors.iter().flat_map(|v|v.to_le_bytes())),checksum(r.uvs.iter().flat_map(|v|v.to_le_bytes())),checksum(r.indices.iter().flat_map(|v|v.to_le_bytes()))),Err(e)=>{eprintln!("{e}");std::process::exit(1);}}}

pub fn style_texture(base:Texture,style:TextureStyle,seed:u32)->Texture{
 if style==TextureStyle::Natural{return base;}let size=if style==TextureStyle::Tiny{8}else if style==TextureStyle::Valheim{64}else{16};let mut pixels=vec![0u8;size*size*4];for y in 0..size{for x in 0..size{let x=x as u32;let y=y as u32;let value=match style{TextureStyle::Minecraft=>144+(texture_hash(x,y,seed)%5)*20+(texture_hash(x>>2,y>>2,seed)%3)*8,TextureStyle::Tiny=>160+(texture_hash(x,y,seed)%5)*20,TextureStyle::Valheim=>170+texture_hash(x>>3,y>>3,seed)%41+texture_hash(x>>1,y>>2,seed)%21+texture_hash(x,y,seed)%13,_=>255}.min(255) as u8;let i=(x as usize+size*y as usize)*4;pixels[i]=value;pixels[i+1]=value;pixels[i+2]=value;pixels[i+3]=255;}}Texture{width:size,height:size,pixels}
}
fn finish_texture_style(mut rock:Rock,style:TextureStyle)->Rock{
 if style==TextureStyle::Flat{if rock.mesh_mode==MeshMode::SuperLow{for i in (0..rock.indices.len()).step_by(3){let mut u=0.0;let mut v=0.0;for j in 0..3{let id=rock.indices[i+j] as usize;u+=rock.uvs[id*2] as f64/3.0;v+=rock.uvs[id*2+1] as f64/3.0;}let x=(u*rock.texture.width as f64).floor().clamp(0.0,(rock.texture.width-1) as f64) as usize;let y=(v*rock.texture.height as f64).floor().clamp(0.0,(rock.texture.height-1) as f64) as usize;let offset=(x+rock.texture.width*y)*4;for j in 0..3{for d in 0..3{rock.colors[rock.indices[i+j] as usize*3+d]=(rock.texture.pixels[offset+d] as f64/255.0) as f32;}}}}rock.texture=style_texture(Texture{width:0,height:0,pixels:Vec::new()},style,0);}rock
}
