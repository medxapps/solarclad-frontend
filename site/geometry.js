function buildTower(){const faces=[];
function face(pts,color,panel=false){faces.push({pts,color,panel,seed:faces.length*.71})}
function box(x,y,z,w,h,d,color='#f4f5ef',panel=false){let a=[x,y,z],b=[x+w,y,z],c=[x+w,y+h,z],d1=[x,y+h,z],e=[x,y,z+d],f=[x+w,y,z+d],g=[x+w,y+h,z+d],hh=[x,y+h,z+d];face([a,b,c,d1],color,panel);face([b,f,g,c],color,panel);face([f,e,hh,g],color,panel);face([e,a,d1,hh],color,panel);face([d1,c,g,hh],'#fafbf6',panel);}
// Site plinth, tower, low annex, entrance pavilion and landscaped terrace.
box(-5.2,-.18,-3.8,9.5,.18,7.5,'#d6dbd1');box(-.8,0,-2.3,4.0,12.8,3.5,'#e6e9e1');
for(let level=0;level<29;level++){let y=2+level*.35;box(-.89,y,-2.39,4.18,.065,3.68,'#f5f6f0');for(let k=0;k<8;k++){let x=-.73+k*.49;box(x,y+.075,-2.405,.43,.24,.025,k%3===0?'#c1cbc6':'#d2d9d2',k>=2&&k<=5&&level%3===0);box(x,y+.075,1.22,.43,.24,.025,'#c7d0c9',k>=2&&k<=5&&level%3===0)}for(let k=0;k<7;k++){let z=-2.28+k*.49;box(3.22,y+.075,z,.024,.24,.43,'#c0ccc5',level%3===0);box(-.825,y+.075,z,.025,.24,.43,'#c9d1ca',level%3===0)}}
// Tall solar ribbons and projecting architectural fins.
for(let k=0;k<6;k++){let x=.28+k*.3;box(x,2,-2.46,.24,10.3,.045,'#aebdb6',k%2===0);box(x,2,1.27,.24,10.3,.035,'#b2c0b8',k%2===0)}for(let k=0;k<7;k++){box(.24+k*.3,1.8,-2.56,.035,11.15,.14,'#f2f4ed');box(.24+k*.3,1.8,1.27,.035,11.15,.14,'#f2f4ed')}
for(let k=0;k<3;k++)box(-1.05,12.7+k*.18,-2.55,4.55,.07,4.02,'#dce2d8');box(-.5,12.8,-2.0,3.3,.15,2.8,'#b7c6bc',true);
for(let x=-.55;x<3;x+=.48)for(let y=.35;y<1.8;y+=.35){box(x,y,-2.32,.2,.22,.025,'#a8b8ad');box(x,y,1.22,.2,.22,.025,'#a8b8ad')}
box(-4.85,0,-1.7,2.8,2.5,3.5,'#eff1e9');box(-4.95,2.5,-1.8,3,.12,3.7,'#f6f7f1');box(-4.72,2.62,-1.55,2.55,.07,3.1,'#bcc8be',true);
box(-3.3,0,-3.25,3.1,1.8,2.3,'#f2f4eb');box(-3.4,1.8,-3.35,3.3,.1,2.5,'#f8f8f2');box(-3.12,1.92,-3.1,2.75,.07,1.9,'#aab49a');
for(let x=-3.1;x<-.2;x+=.2)box(x,.15,-3.29,.14,1.35,.03,'#9fafaa',true);for(let x=-4.6;x<-2.1;x+=.22)box(x,.2,-1.73,.16,1.65,.03,'#b5c0b8');
box(.3,0,-3.6,1.8,.08,1.2,'#c0c8bd');box(.2,1.65,-3.25,2.0,.12,1,'#8c9e94',true);for(let x of [.24,2.08])box(x,0,-3.2,.08,1.7,.08,'#d5ddd1');
for(let z=-3.35;z<-2.35;z+=.12)box(.3,0,z,1.8,(z+3.5)*.2,.12,'#dae0d4');
for(let x of [-2.8,-1.8,-.8]){box(x,1.95,-2.5,.5,.12,.5,'#e6e9dc');box(x+.2,2,-2.28,.05,.45,.05,'#87937c');box(x+.05,2.32,-2.43,.35,.28,.35,'#91a181')}

for(let z=-1.6;z<1.6;z+=.4)for(let y=.2;y<2.3;y+=.4){box(-4.87,y,z,.025,.36,.36,'#8d9e98',true);box(-2.035,y,z,.025,.36,.36,'#8d9e98',true)}
for(let x=-4.7;x<-2.1;x+=.4)for(let y=.2;y<2.3;y+=.4)box(x,y,1.805,.36,.36,.025,'#8d9e98',true);
return faces;}