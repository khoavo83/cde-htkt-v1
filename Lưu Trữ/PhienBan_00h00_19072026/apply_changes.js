const fs = require('fs');
let text = fs.readFileSync('src/app/page.js', 'utf-8');

// 1. Sửa tab mặc định
text = text.replace(/const \[activeMainTab, setActiveMainTab\] = useState\('[^']+'\);/, "const [activeMainTab, setActiveMainTab] = useState('projects');");
text = text.replace(/const \[projectSubTab, setProjectSubTab\] = useState\('[^']+'\);/, "const [projectSubTab, setProjectSubTab] = useState('folders');");

// 2. Sửa Tab tiếng Việt (Dashboard, Projects, Data, Settings) ở Sidebar
text = text.replace(/>Dashboard<\/span>/g, ">Tổng quan</span>");
text = text.replace(/>Projects<\/span>/g, ">Quản lý dự án</span>");
text = text.replace(/>Data<\/span>/g, ">Dữ liệu</span>");
text = text.replace(/>Settings<\/span>/g, ">Cài đặt</span>");

// 3. Sửa Tab tiếng Việt ở Project Header (Data, Folders, Progress, GIS Map)
text = text.replace(/>Data<\/button>/g, ">Dữ liệu</span></button>".replace('</span></button>', '</button>'));
text = text.replace(/>Folders<\/button>/g, ">Thư mục</span></button>".replace('</span></button>', '</button>'));
text = text.replace(/>Progress<\/button>/g, ">Tiến độ</span></button>".replace('</span></button>', '</button>'));
text = text.replace(/>GIS Map<\/button>/g, ">Bản đồ GIS</span></button>".replace('</span></button>', '</button>'));
text = text.replace(/>Folders<\/span>/g, ">Thư mục</span>");
text = text.replace(/>Progress<\/span>/g, ">Tiến độ</span>");
text = text.replace(/>GIS Map<\/span>/g, ">Bản đồ GIS</span>");

// Đảm bảo không bị lặp span nếu nó chỉ là text
// Tìm và replace trực tiếp text content
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('data'\)\}[\s\S]*?Data/g,
  (match) => match.replace('Data', 'Dữ liệu')
);
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('folders'\)\}[\s\S]*?Folders/g,
  (match) => match.replace('Folders', 'Thư mục')
);
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('progress'\)\}[\s\S]*?Progress/g,
  (match) => match.replace('Progress', 'Tiến độ')
);
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('gis'\)\}[\s\S]*?GIS Map/g,
  (match) => match.replace('GIS Map', 'Bản đồ GIS')
);

// Sửa button Tab Header - Dành cho các Button
// Dùng regex để matching 4 cái button tab
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('data'\)\}([\s\S]*?)>(\s*)Data(\s*)<\/button>/,
  "onClick={() => setProjectSubTab('data')}$1>$2Dữ liệu$3</button>"
);
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('folders'\)\}([\s\S]*?)>(\s*)Folders(\s*)<\/button>/,
  "onClick={() => setProjectSubTab('folders')}$1>$2Thư mục$3</button>"
);
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('progress'\)\}([\s\S]*?)>(\s*)Progress(\s*)<\/button>/,
  "onClick={() => setProjectSubTab('progress')}$1>$2Tiến độ$3</button>"
);
text = text.replace(
  /onClick=\{\(\) => setProjectSubTab\('gis'\)\}([\s\S]*?)>(\s*)GIS Map(\s*)<\/button>/,
  "onClick={() => setProjectSubTab('gis')}$1>$2Bản đồ GIS$3</button>"
);

// 4. Sửa fetchDocs() thành fetchData()
text = text.replace(/fetchDocs\(\);/g, "fetchData();");

fs.writeFileSync('src/app/page.js', text, 'utf-8');
console.log("Applied changes correctly");
