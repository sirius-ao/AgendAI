"""Extract photographs only, using the supplied design references.
Usage: python scripts/crop-assets.py C:/path/to/AGENDAI-APP
Requires Pillow (python -m pip install Pillow).
"""
from pathlib import Path
from PIL import Image
import sys

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'apps/website/public/images'
crops = [
    ('1.png', (520, 64, 984, 457), 'home/hero-teacher.webp'),
    ('4.png', (582, 70, 1312, 461), 'schools/school-team.webp'),
    ('5.png', (573, 70, 1230, 343), 'blog/teacher-writing.webp'),
    ('5.png', (51, 416, 314, 553), 'blog/lesson-plan.webp'),
    ('5.png', (333, 416, 595, 553), 'blog/classroom.webp'),
    ('5.png', (614, 416, 871, 553), 'blog/attendance.webp'),
    ('5.png', (51, 733, 314, 870), 'blog/continuous-assessment.webp'),
    ('5.png', (333, 733, 595, 870), 'blog/teacher-productivity.webp'),
    ('5.png', (614, 733, 871, 870), 'blog/education-books.webp'),
]
for filename, box, output in crops:
    dest = target / output
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.open(source / filename).convert('RGB').crop(box).save(dest, 'WEBP', quality=90, method=6)
    print(f'{output}: {dest.stat().st_size // 1024} KB')
