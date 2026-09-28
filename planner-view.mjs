// Local, pinned dependency. Each figure owns one scene; geometries are reused.
let THREE;
try { THREE = await import('./vendor/three/three.module.js'); } catch {}
export class View {
  constructor(container) {
    this.container = container;
    this.fallback = document.createElement('canvas');
    this.fallback.width = 900; this.fallback.height = 600;
    container.append(this.fallback);
    this.ctx = this.fallback.getContext('2d');
    this.ready = false;
    if (THREE && new URLSearchParams(location.search).get('renderer') !== '2d') try {
      this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:false});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#20342a');
      this.camera = new THREE.PerspectiveCamera(40,1.5,.005,5000);
      this.scene.add(new THREE.HemisphereLight(0xe9f8db,0x364934,3));
      const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-4,8,5);this.scene.add(light);
      this.people = new THREE.Group();this.scene.add(this.people);
      this.background = new THREE.Group();this.scene.add(this.background);
      this.sphere = new THREE.SphereGeometry(1,24,16);
      this.box = new THREE.BoxGeometry(1,1,1);
      this.skin = new THREE.MeshStandardMaterial({color:0xe9bd91,roughness:.85});
      this.shirt = new THREE.MeshStandardMaterial({color:0xc7ef63,roughness:.9});
      this.pants = new THREE.MeshStandardMaterial({color:0x50765d,roughness:.9});
      this.dark = new THREE.MeshStandardMaterial({color:0x253127,roughness:.9});
      this.orange = new THREE.MeshStandardMaterial({color:0xee7952,roughness:.9});
      for(let i=-6;i<=6;i++){
        const m=new THREE.Mesh(this.box,this.orange);m.scale.set(.8,1.7,.25);m.position.set(i*2,.85,0);this.background.add(m);
      }
      this.grid = new THREE.GridHelper(200,100,0x667d59,0x354c3c);this.scene.add(this.grid);
      container.append(this.renderer.domElement);
      this.fallback.hidden=true;this.ready=true;
      this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;this.renderer.domElement.hidden=true;this.fallback.hidden=false;if(this.last)this.draw(this.last);});
    } catch { this.renderer?.dispose(); }
    this.resize=new ResizeObserver(()=>{if(this.last)this.draw(this.last);});
    this.resize.observe(container);
  }
  part(parent,material,x,y,z,sx,sy,sz,box=false) {
    const m=new THREE.Mesh(box?this.box:this.sphere,material);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  }
  human(p,x,z) {
    const group=new THREE.Group();group.position.set(x,0,z);
    const h=p.height, w=p.shoulder;
    this.part(group,this.shirt,0,h*.58,0,w*.48,h*.21,.12);
    this.part(group,this.pants,-w*.23,h*.22,0,.09,h*.23,.1);
    this.part(group,this.pants,w*.23,h*.22,0,.09,h*.23,.1);
    this.part(group,this.skin,-w*.57,h*.56,0,.055,h*.20,.06);
    this.part(group,this.skin,w*.57,h*.56,0,.055,h*.20,.06);
    const head=new THREE.Group();head.position.y=h-.13;head.rotation.y=p.angle*Math.PI/180;
    this.part(head,this.skin,0,0,0,.082,.13,.10);
    this.part(head,this.skin,0,-.015,.118,.023,.028,.047);
    this.part(head,this.skin,-.09,-.006,-.006,.019,.037,.022);
    this.part(head,this.skin,.09,-.006,-.006,.019,.037,.022);
    this.part(head,this.dark,-.034,.025,.09,.012,.008,.008);
    this.part(head,this.dark,.034,.025,.09,.012,.008,.008);
    this.part(head,this.dark,0,-.060,.09,.027,.003,.005);
    group.add(head);this.people.add(group);
  }
  draw(p) {
    this.last=p;
    const aspect=p.sensor.width/p.sensor.height;
    this.container.style.aspectRatio=String(aspect);
    const columns=Math.ceil(p.count/p.rows), spacing=p.shoulder+p.gap;
    const span=p.distance*p.sensor.width/p.focal;
    const offset=p.position*span/2;
    if(this.ready){
      const sizeKey=[p.height,p.shoulder,p.count,p.rows,p.gap,p.angle].join('/');
      if(this.sizeKey!==sizeKey){
        this.people.clear();
        for(let i=0;i<p.count;i++)this.human(p,((i%columns)-(columns-1)/2)*spacing,-Math.floor(i/columns)*.6);
        this.sizeKey=sizeKey;
      }
      this.people.position.x=offset;
      this.background.position.z=-p.backgroundGap;
      const cameraHeight=p.head?p.height-.13:p.half?p.height-p.halfHeight/2:p.height/2;
      this.camera.position.set(0,cameraHeight,p.distance);
      this.camera.lookAt(0,cameraHeight,0);
      this.camera.fov=2*Math.atan(p.sensor.height/(2*p.focal))*180/Math.PI;
      this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
      const width=Math.max(1,this.container.clientWidth);
      this.renderer.setSize(width,width/aspect,false);
      this.renderer.render(this.scene,this.camera);
    }else this.drawFallback(p,offset);
  }
  drawFallback(p,offset) {
    const c=this.ctx,w=900,h=Math.round(w*p.sensor.height/p.sensor.width);
    this.fallback.width=w;this.fallback.height=h;
    c.fillStyle='#20342a';c.fillRect(0,0,w,h);
    const cy=p.head?p.height-.13:p.half?p.height-p.halfHeight/2:p.height/2;
    const project=(x,y,z)=>[w/2+x*p.focal/(p.sensor.width*(p.distance-z))*w,h/2-(y-cy)*p.focal/(p.sensor.height*(p.distance-z))*h];
    const ellipse=(x,y,z,rx,ry,color)=>{
      const [px,py]=project(x,y,z),scale=p.focal/(p.sensor.width*(p.distance-z))*w;
      if(scale<=0||!Number.isFinite(scale))return;
      c.fillStyle=color;c.beginPath();c.ellipse(px,py,Math.max(.1,rx*scale),Math.max(.1,ry*scale),0,0,Math.PI*2);c.fill();
    };
    for(let i=-6;i<=6;i++){
      const [x,y]=project(i*2-.4,1.7,-p.backgroundGap),[r,b]=project(i*2+.4,0,-p.backgroundGap);
      c.fillStyle='#b76f4d';c.fillRect(x,y,r-x,b-y);
    }
    const cols=Math.ceil(p.count/p.rows);
    for(let i=p.count-1;i>=0;i--){
      const x=(i%cols-(cols-1)/2)*(p.shoulder+p.gap)+offset,z=-Math.floor(i/cols)*.6;
      ellipse(x,p.height*.58,z,p.shoulder*.48,p.height*.21,'#c7ef63');
      for(const sign of [-1,1]){
        ellipse(x+sign*p.shoulder*.23,p.height*.22,z,.09,p.height*.23,'#50765d');
        ellipse(x+sign*.09,p.height-.136,z-.006,.019,.037,'#e9bd91');
      }
      ellipse(x,p.height-.13,z,.082,.13,'#e9bd91');
      ellipse(x+Math.sin(p.angle*Math.PI/180)*.118,p.height-.145,z+.118,.023,.028,'#ca9263');
      for(const sign of [-1,1])ellipse(x+sign*.034,p.height-.105,z+.09,.01,.008,'#253127');
    }
    c.fillStyle='#d5e8cb';c.font='16px sans-serif';c.fillText('2D 投影後備示意',18,28);
  }
}
export function drawMap(canvas,p) {
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  c.clearRect(0,0,w,h);c.fillStyle='#e9eee4';c.fillRect(0,0,w,h);
  const end=p.distance+p.backgroundGap,scale=380/Math.max(end,1),x0=45,y0=120;
  const subjectX=x0+p.distance*scale,bgX=x0+end*scale;
  const nearHalf=Math.min(70,p.distance*p.sensor.width/p.focal*scale/2);
  c.strokeStyle='#8ba773';c.fillStyle='#c7ef6333';c.beginPath();c.moveTo(x0,y0);c.lineTo(subjectX,y0-nearHalf);c.lineTo(subjectX,y0+nearHalf);c.closePath();c.fill();c.stroke();
  c.fillStyle='#245f45';c.fillRect(x0-5,y0-6,10,12);
  c.fillStyle='#ee7952';c.fillRect(bgX,25,3,155);
  c.fillStyle='#245f45';
  const cols=Math.ceil(p.count/p.rows);
  for(let i=0;i<p.count;i++){c.beginPath();c.arc(subjectX+Math.floor(i/cols)*.6*scale,y0+(i%cols-(cols-1)/2)*(p.shoulder+p.gap)*scale,4,0,7);c.fill();}
  c.font='15px sans-serif';c.fillText('相機',20,205);c.fillText('主體 '+p.distance.toFixed(2)+'m',Math.min(subjectX,300),205);c.fillText('背景 +'+p.backgroundGap.toFixed(1)+'m',Math.min(bgX,370),22);
  c.strokeStyle='#b5c3aa';c.beginPath();c.moveTo(490,15);c.lineTo(490,215);c.stroke();
  const sx=540,sy=177,personX=sx+p.distance*scale,cameraY=sy-(p.head?p.height-.13:p.half?p.height-p.halfHeight/2:p.height/2)*35;
  c.strokeStyle='#245f45';c.beginPath();c.moveTo(sx,cameraY);c.lineTo(personX,sy-p.height*35);c.moveTo(sx,cameraY);c.lineTo(personX,sy);c.stroke();
  c.fillStyle='#245f45';c.fillRect(sx-5,cameraY-5,10,10);c.fillRect(personX-4,sy-p.height*35,8,p.height*35);
  c.fillStyle='#ee7952';c.fillRect(sx+end*scale,30,3,150);
  c.fillStyle='#506449';c.fillText('側視 · 人物 '+p.height.toFixed(2)+'m',540,205);
}
