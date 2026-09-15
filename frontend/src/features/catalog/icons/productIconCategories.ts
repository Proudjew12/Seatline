export const PRODUCT_ICON_CATEGORIES = [
  { id: "general", name: "General symbols", keywords: "general generic symbols כללי סמלים" },
  { id: "productivity", name: "Productivity & Email", keywords: "productivity office email mail פרודוקטיביות משרד דואר מייל" },
  { id: "collaboration", name: "Collaboration & Projects", keywords: "collaboration projects meetings chat שיתוף פעולה פרויקטים פגישות" },
  { id: "security", name: "Security & Identity", keywords: "security identity antivirus endpoint firewall אבטחה זהויות אנטי וירוס הגנה" },
  { id: "backup", name: "Backup & Migration", keywords: "backup recovery migration storage גיבוי שחזור העברה מיגרציה אחסון" },
  { id: "infrastructure", name: "IT & Cloud", keywords: "it cloud infrastructure network management remote ענן תשתיות רשת ניהול מרחוק" },
  { id: "design", name: "Design & Documents", keywords: "design documents creative pdf עיצוב מסמכים גרפיקה" },
  { id: "development", name: "Development Tools", keywords: "development devops code programming פיתוח תכנות קוד" },
  { id: "business", name: "Business & Analytics", keywords: "business analytics crm sales reporting עסקים ניתוח נתונים מכירות" },
] as const;

export type ProductIconCategoryId = (typeof PRODUCT_ICON_CATEGORIES)[number]["id"];
