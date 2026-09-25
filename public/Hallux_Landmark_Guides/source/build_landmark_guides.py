from pathlib import Path
import base64,json,math,subprocess,zipfile,hashlib
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from PIL import Image,ImageDraw,ImageFont

ROOT=Path('/workspace/scratch/a495a650a6aa')
OUT=ROOT/'output/Hallux_Landmark_Guides'
OUT.mkdir(parents=True,exist_ok=True)
SRC=ROOT/'generated_images/exec-07395574-c59c-4122-8fdf-03c1ee296b5f.png'
W,H=Image.open(SRC).size
img=base64.b64encode(SRC.read_bytes()).decode()
COL={'mt1':'#b5ff64','mt2':'#62efff','prox':'#62efff','dist':'#b5ff64','articular':'#ffce65','perpendicular':'#b5ff64','joint':'#ffce65'}
DATA={
 'mt1':{'label':'Metatarsal I','sections':[[[298,548],[364,548]],[[339,655],[417,655]]]},
 'mt2':{'label':'Metatarsal II','sections':[[[458,545],[491,545]],[[460,660],[496,660]]]},
 'prox':{'label':'Falang proksimal hallux','sections':[[[299,285],[373,285]],[[287,355],[367,355]]]},
 'dist':{'label':'Falang distal hallux','sections':[[[338,135],[388,135]],[[318,183],[386,183]]]},
}
def midpoint(a,b):return [(a[0]+b[0])/2,(a[1]+b[1])/2]
def axis(key):
 a,b=[midpoint(*s) for s in DATA[key]['sections']]
 return a,b
def direction(a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];n=math.hypot(dx,dy)
 return dx/n,dy/n
def extended(a,b,start,end):
 dx,dy=direction(a,b)
 return [a[0]+dx*start,a[1]+dy*start],[a[0]+dx*end,a[1]+dy*end]
def intersection(a,b,c,d):
 ux,uy=b[0]-a[0],b[1]-a[1];vx,vy=d[0]-c[0],d[1]-c[1]
 den=ux*vy-uy*vx
 if abs(den)<1e-8:return None
 t=((c[0]-a[0])*vy-(c[1]-a[1])*vx)/den
 return [a[0]+t*ux,a[1]+t*uy]
def line(id,a,b,color,dashed=False,width=4):
 dash='stroke-dasharray="10 8"' if dashed else ''
 return f'<line id="{id}" x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}" stroke="{color}" stroke-width="{width}" {dash} stroke-linecap="round"/>'
def point(id,p,color='#ffdc56',r=5):
 return f'<circle id="{id}" cx="{p[0]}" cy="{p[1]}" r="{r}" fill="{color}" stroke="#15222e" stroke-width="1.6"/>'
def label(x,y,text,color='#ffffff',size=23):
 return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-family="sans-serif" stroke="#12212d" stroke-width="3.5" paint-order="stroke fill">{escape(text)}</text>'
def controls(key):
 s=f'<g id="{key}-cortical-points">'
 for j,(a,b) in enumerate(DATA[key]['sections']):
  s+=line(f'{key}-cross-{j+1}',a,b,'#ffd953',True,2)
  s+=point(f'{key}-cortex-{j+1}-a',a)+point(f'{key}-cortex-{j+1}-b',b)
  s+=point(f'{key}-midpoint-{j+1}',midpoint(a,b),'#ffffff',4)
 return s+'</g>'
def draw_axis(key,start,end,dashed=False):
 a,b=axis(key);p,q=extended(a,b,start,end)
 return line(key+'-axis',p,q,COL[key],dashed,3.5 if dashed else 4)
def wedge(a,b,c,d,r=75):
 o=intersection(a,b,c,d)
 if o is None or not(50<o[0]<900 and 40<o[1]<1100):return ''
 # Choose the upward ray of each axis so the displayed sector is the acute angle.
 dirs=[]
 for p,q in [(a,b),(c,d)]:
  dx,dy=direction(p,q)
  if dy>0:dx,dy=-dx,-dy
  dirs.append(math.atan2(dy,dx))
 t1,t2=dirs
 delta=(t2-t1+math.pi)%(2*math.pi)-math.pi
 if abs(delta)>math.pi/2:delta-=math.copysign(math.pi,delta)
 pts=[o]+[[o[0]+r*math.cos(t1+delta*i/24),o[1]+r*math.sin(t1+delta*i/24)] for i in range(25)]
 coords=' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)
 return f'<polygon id="illustrative-angle-sector" points="{coords}" fill="#e270ed" fill-opacity=".32" stroke="#ed9bf5" stroke-width="1.3"/>'

articular=[[272,438],[369,443]]
joint='M360 780 C379 763 409 754 441 765'
joint_markers=[[360,780],[401,759],[441,765]]
SPEC=[
 ('01_HVA','HVA','Hallux valgus angle','Sumbu MT I + falang proksimal','00:12–00:24'),
 ('02_IMA','IMA','Intermetatarsal angle','Sumbu MT I + MT II','00:27–00:37'),
 ('03_DMAA','DMAA','Distal metatarsal articular angle','Garis permukaan sendi + tegak lurus MT I','00:41–01:00'),
 ('04_HIA','HIA','Hallux interphalangeal angle','Sumbu falang proksimal + distal','01:03–01:17'),
 ('05_TMT1','TMT I','Metatarsocuneiform joint','Garis orientasi sendi MT I–cuneiform','01:20–01:32'),
]
def overlay(index):
 s='<g id="landmark-guide" fill="none">'
 if index==0:
  s+=wedge(*axis('mt1'),*axis('prox'),95)
  s+=draw_axis('mt1',-235,260)+draw_axis('prox',-45,310)
  s+=controls('mt1')+controls('prox')
  s+=label(65,680,'MT I',COL['mt1'])+line('leader-mt1',[145,672],[367,640],COL['mt1'],True,1.5)
  s+=label(45,278,'Falang proksimal',COL['prox'],19)+line('leader-prox',[214,285],[328,315],COL['prox'],True,1.5)
 elif index==1:
  o=intersection(*axis('mt1'),*axis('mt2'))
  s+=wedge(*axis('mt1'),*axis('mt2'),170)
  for key in ['mt1','mt2']:
   a,b=axis(key);end=math.dist(a,o)+20
   s+=draw_axis(key,-160,end)+controls(key)
  s+=label(75,635,'MT I',COL['mt1'])+line('leader-1',[148,627],[352,607],COL['mt1'],True,1.5)
  s+=label(730,625,'MT II',COL['mt2'])+line('leader-2',[720,617],[476,600],COL['mt2'],True,1.5)
 elif index==2:
  a,b=axis('mt1');dx,dy=direction(a,b);m=midpoint(*articular)
  # Perpendicular passes through the illustration's MT1 axis at the articular midpoint height.
  o=[a[0]+(m[1]-a[1])*(b[0]-a[0])/(b[1]-a[1]),m[1]]
  p=[o[0]-dy*140,o[1]+dx*140];q=[o[0]+dy*140,o[1]-dx*140]
  aa,bb=extended(*articular,-60,175)
  s+=wedge(p,q,aa,bb,60)
  s+=draw_axis('mt1',-210,230,True)+controls('mt1')
  s+=line('articular-surface-chord',aa,bb,COL['articular'])
  s+=line('perpendicular-to-mt1',p,q,COL['perpendicular'])
  for j,pnt in enumerate(articular):s+=point(f'articular-edge-{j+1}',pnt)
  s+=label(35,328,'Garis permukaan sendi',COL['articular'],19)
  s+=line('leader-articular',[250,333],[325,441],COL['articular'],True,1.5)
  s+=label(570,550,'Tegak lurus sumbu MT I',COL['perpendicular'],19)
  s+=line('leader-perpendicular',[565,534],[392,394],COL['perpendicular'],True,1.5)
 elif index==3:
  s+=wedge(*axis('prox'),*axis('dist'),85)
  s+=draw_axis('prox',-205,125)+draw_axis('dist',-60,300)
  s+=controls('prox')+controls('dist')
  s+=label(50,129,'Falang distal',COL['dist'],19)+line('leader-dist',[203,135],[359,154],COL['dist'],True,1.5)
  s+=label(50,339,'Falang proksimal',COL['prox'],19)+line('leader-prox',[224,344],[329,328],COL['prox'],True,1.5)
 else:
  s+=f'<path id="tmt1-joint-curve" d="{joint}" stroke="{COL["joint"]}" stroke-width="6" stroke-linecap="round"/>'
  for j,pnt in enumerate(joint_markers):s+=point(f'tmt1-curve-marker-{j+1}',pnt)
  s+=line('joint-leader',[160,861],[399,763],COL['joint'],True,2)
  s+=label(40,894,'Sendi metatarsocuneiform I',COL['joint'],22)
  s+=label(40,926,'Panduan orientasi garis sendi',COL['joint'],18)
 return s+'</g>'
def svg(index,with_image):
 key,short,title,desc,time=SPEC[index]
 meta={'source_video':'Hallux Valgus.mp4','video_time_approx':time,'guide':title,'coordinate_system':[W,H],'units':'cartoon image pixels','registration_to_original_xray':False,'landmark_status':'Illustrative approximate points placed manually on generated cartoon; not validated patient landmarks','angle_values':None}
 head=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><title>{escape(title)} — Cartoon landmark guide</title><metadata>{escape(json.dumps(meta))}</metadata>'
 if with_image:head+=f'<image id="cartoon-reference" width="{W}" height="{H}" xlink:href="data:image/png;base64,{img}"/>'
 head+=label(30,36,short+' · '+title,'#ffffff',22)
 return head+overlay(index)+'</svg>'

for i,(key,*_) in enumerate(SPEC):
 for with_image in [True,False]:
  file=OUT/f'{key}_{"Cartoon" if with_image else "Lines_Only"}.svg'
  file.write_text(svg(i,with_image));ET.parse(file)
  if not with_image:assert '<image ' not in file.read_text()

metadata={'viewBox':[0,0,W,H],'image_asset':'Foot_Cartoon_3D','points_are':'illustrative guide coordinates, not patient landmarks','axes':DATA,'dmaa_articular_chord':articular,'tmt1_curve_svg_d':joint,'no_measured_angles':True,'source_video':'Hallux Valgus.mp4','chapters':[{'file_prefix':s[0],'name':s[2],'approx_time':s[4]} for s in SPEC]}
(OUT/'Landmark_Guide_Points.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))

# Overview emphasizes toe/metatarsal landmarks; full-size SVGs keep the whole foot.
sheet=['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1500" height="1340" viewBox="0 0 1500 1340">',
 '<rect width="1500" height="1340" fill="#101e29"/>',
 '<g font-family="sans-serif" fill="#eaf5fd"><text x="36" y="49" font-size="29" font-weight="bold">HALLUX · PANDUAN LANDMARK</text><text x="36" y="81" font-size="17" fill="#afc3d2">Mengikuti metode garis dalam video · Titik contoh pada ilustrasi kartun 3D</text></g>']
for i,s in enumerate(SPEC):
 xx=25+(i%3)*495;yy=112+(i//3)*600
 sheet.append(f'<rect x="{xx}" y="{yy}" width="475" height="580" rx="14" fill="#20323f"/>')
 sheet.append(f'<text x="{xx+18}" y="{yy+32}" fill="#ffffff" font-size="23" font-weight="bold" font-family="sans-serif">{s[1]}</text>')
 sheet.append(f'<text x="{xx+18}" y="{yy+56}" fill="#c1d2df" font-size="14" font-family="sans-serif">{escape(s[3])}</text>')
 sheet.append(f'<defs><clipPath id="panelclip{i}" clipPathUnits="userSpaceOnUse"><rect x="{xx+10}" y="{yy+74}" width="455" height="490"/></clipPath></defs><g clip-path="url(#panelclip{i})"><svg x="{xx+10}" y="{yy+74}" width="455" height="490" viewBox="30 65 900 970"><image width="{W}" height="{H}" xlink:href="data:image/png;base64,{img}"/>{overlay(i)}</svg></g>')
sheet.append('''<g transform="translate(1050 770)" font-family="sans-serif">
<text fill="#ffffff" font-size="24" font-weight="bold">Cara membaca garis</text>
<circle cx="10" cy="62" r="6" fill="#ffdc56"/><text x="28" y="69" fill="#d4e1eb" font-size="18">Titik bantu tepi tulang</text>
<circle cx="10" cy="103" r="5" fill="white"/><text x="28" y="110" fill="#d4e1eb" font-size="18">Titik tengah pasangan</text>
<path d="M0 149 H28" stroke="#b5ff64" stroke-width="4"/><text x="40" y="155" fill="#d4e1eb" font-size="18">Garis sumbu / referensi</text>
<text x="0" y="217" fill="#c2d2df" font-size="17">5 SVG dengan gambar kartun</text>
<text x="0" y="249" fill="#c2d2df" font-size="17">5 SVG garis transparan saja</text>
<text x="0" y="281" fill="#c2d2df" font-size="17">JSON koordinat titik bantu</text>
<text x="0" y="353" fill="#ffdb89" font-size="17">Bukan pengukuran pasien.</text>
<text x="0" y="382" fill="#ffdb89" font-size="17">Tidak ada nilai sudut klinis.</text></g>
<text x="36" y="1320" fill="#afc3d2" font-family="sans-serif" font-size="16">Garis dapat diedit terpisah. Koordinat hanya berlaku pada ilustrasi ini, bukan pada X-ray asli.</text></svg>''')
(OUT/'Preview.svg').write_text('\n'.join(sheet))
subprocess.run(['inkscape',str(OUT/'Preview.svg'),f'--export-filename={OUT/"Preview.png"}'],check=True,capture_output=True)

(OUT/'README.txt').write_text('''PANDUAN LANDMARK HALLUX — GARIS SESUAI VIDEO

Sumber metode: video pengguna Hallux Valgus.mp4, durasi sekitar 120 detik.
Latar panduan: ilustrasi Foot_Cartoon_3D yang sudah dibuat, 1000 x 1573 px.

ISI: 5 SVG dengan kartun + 5 SVG Lines_Only transparan.
HVA: sumbu metatarsal I dan falang proksimal hallux.
IMA: sumbu metatarsal I dan metatarsal II.
DMAA: garis tepi permukaan artikular distal MT I dan garis tegak lurus sumbu MT I.
HIA: sumbu falang proksimal dan distal hallux.
TMT I: garis contoh orientasi sendi metatarsocuneiform pertama, bukan sudut numerik.

Titik kuning adalah contoh titik tepi tulang; titik putih merupakan titik tengah
pasangan; garis putus pendek menghubungkan pasangan titik pada dua level shaft.
Sumbu dibuat melalui kedua titik tengah tersebut, mengikuti contoh video.
Pada DMAA, dua titik tambahan menandai ujung garis permukaan artikular.
Sektor ungu menunjukkan pasangan arah garis; tidak menampilkan nilai sudut.
Bonus temuan sesamoid/MT I pendek pada video tidak direplikasi sebagai hasil
diagnosis atau pengukuran baru pada ilustrasi.

EDIT DAN INTEGRASI
Semua file memakai viewBox 0 0 1000 1573, sama dengan kartun sebelumnya.
Overlay Lines_Only berisi vektor saja. Kartun adalah raster tertanam di SVG.
Pertahankan posisi, ukuran kontainer, dan preserveAspectRatio yang sama.
Path/line/circle memiliki ID masing-masing; koordinat juga tersedia dalam JSON.
SVG bersifat statis: menggeser circle saja di editor tidak menghitung ulang garis.
Aplikasi harus menghitung ulang midpoint, axis, dan perpendicular ketika
titik diubah. Tidak ada deteksi landmark otomatis dalam file ini.

BATASAN
Titik dipasang manual sebagai contoh visual pada gambar kartun AI, bukan
hasil segmentasi radiograf dan bukan landmark pasien tervalidasi.
Jangan menyalin koordinat ini langsung ke radiograf asli atau radiograf pasien.
Tidak dicantumkan nilai sudut normal, diagnosis, atau hasil pengukuran pasien.
Gunakan sebagai panduan UI; pengukuran dilakukan pada radiograf yang sesuai.
''')
zip_path=OUT.parent/'Hallux_Landmark_Guides.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.iterdir()):
  if p.name!='Preview.svg':z.write(p,p.name)
 z.write(Path(__file__),'source/build_landmark_guides.py')
with zipfile.ZipFile(zip_path) as z:assert z.testzip() is None
(ROOT/'landmark_zip_sha256.txt').write_text(hashlib.sha256(zip_path.read_bytes()).hexdigest())
print(zip_path,zip_path.stat().st_size)
