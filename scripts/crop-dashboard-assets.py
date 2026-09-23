"""Extract only illustration/photo regions from the supplied dashboard references."""
from pathlib import Path
from PIL import Image
import sys
source=Path(sys.argv[1])
target=Path(__file__).resolve().parents[1]/'apps/website/public/images/dashboard'
crops=[
 ('11.png',(522,249,618,342),'avatars/teacher.webp'),
 ('10.png',(283,459,332,510),'avatars/student-male.webp'),
 ('10.png',(283,373,333,426),'avatars/student-female.webp'),
 ('10.png',(283,774,333,827),'avatars/student-male-2.webp'),
 ('10.png',(283,692,333,745),'avatars/student-female-2.webp'),
 ('9.png',(520,370,749,481),'resources/industry.webp'),
 ('9.png',(521,788,749,902),'resources/anatomy.webp'),
 ('9.png',(271,585,502,693),'resources/plant.webp'),
 ('9.png',(766,585,995,693),'resources/equations.webp'),
 ('9.png',(1011,585,1238,693),'resources/books.webp'),
 ('9.png',(271,788,502,902),'resources/chemistry.webp'),
 ('9.png',(766,788,995,902),'resources/map.webp'),
 ('9.png',(1011,788,1239,902),'resources/robotics.webp'),
]
for filename,box,name in crops:
 dest=target/name;dest.parent.mkdir(parents=True,exist_ok=True)
 Image.open(source/filename).convert('RGB').crop(box).save(dest,'WEBP',quality=90,method=6)
 print(name)
