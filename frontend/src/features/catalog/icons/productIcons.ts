import iconGeneric from "./generic.svg?no-inline";
import iconCloud from "./cloud.svg?no-inline";
import iconSecurity from "./security.svg?no-inline";
import iconDatabase from "./database.svg?no-inline";
import iconServer from "./server.svg?no-inline";
import iconEmail from "./email.svg?no-inline";
import iconDevelopment from "./development.svg?no-inline";
import iconDesign from "./design.svg?no-inline";
import iconMicrosoftoffice from "./microsoftoffice.svg?no-inline";
import iconMicrosoft from "./microsoft.svg?no-inline";
import iconMicrosoftazure from "./microsoftazure.svg?no-inline";
import iconMicrosoftteams from "./microsoftteams.svg?no-inline";
import iconMicrosoftoutlook from "./microsoftoutlook.svg?no-inline";
import iconMicrosoftonedrive from "./microsoftonedrive.svg?no-inline";
import iconMicrosoftsharepoint from "./microsoftsharepoint.svg?no-inline";
import iconMicrosoftexchange from "./microsoftexchange.svg?no-inline";
import iconPowerbi from "./powerbi.svg?no-inline";
import iconAcronis from "./acronis.svg?no-inline";
import iconAdobe from "./adobe.svg?no-inline";
import iconAdobeacrobatreader from "./adobeacrobatreader.svg?no-inline";
import iconAdobecreativecloud from "./adobecreativecloud.svg?no-inline";
import iconAdobephotoshop from "./adobephotoshop.svg?no-inline";
import iconAdobeillustrator from "./adobeillustrator.svg?no-inline";
import iconGoogle from "./google.svg?no-inline";
import iconGoogledrive from "./googledrive.svg?no-inline";
import iconGmail from "./gmail.svg?no-inline";
import iconGooglecloud from "./googlecloud.svg?no-inline";
import iconGooglemeet from "./googlemeet.svg?no-inline";
import iconGoogledocs from "./googledocs.svg?no-inline";
import iconGooglesheets from "./googlesheets.svg?no-inline";
import iconZoom from "./zoom.svg?no-inline";
import iconSlack from "./slack.svg?no-inline";
import iconDropbox from "./dropbox.svg?no-inline";
import iconAtlassian from "./atlassian.svg?no-inline";
import iconJira from "./jira.svg?no-inline";
import iconConfluence from "./confluence.svg?no-inline";
import iconNotion from "./notion.svg?no-inline";
import iconFigma from "./figma.svg?no-inline";
import iconCanva from "./canva.svg?no-inline";
import iconGithub from "./github.svg?no-inline";
import iconGitlab from "./gitlab.svg?no-inline";
import iconDocker from "./docker.svg?no-inline";
import iconAmazonaws from "./amazonaws.svg?no-inline";
import iconCloudflare from "./cloudflare.svg?no-inline";
import iconSalesforce from "./salesforce.svg?no-inline";
import iconHubspot from "./hubspot.svg?no-inline";
import iconVeeam from "./veeam.svg?no-inline";
import iconVmware from "./vmware.svg?no-inline";
import iconSentinelone from "./sentinelone.svg?no-inline";
import iconBittitan from "./bittitan.png?no-inline";
import iconBitdefender from "./bitdefender.svg?no-inline";
import iconFortinet from "./fortinet.svg?no-inline";
import iconAutodesk from "./autodesk.svg?no-inline";
import iconCisco from "./cisco.svg?no-inline";
import iconOkta from "./okta.svg?no-inline";
import icon1password from "./1password.svg?no-inline";
import iconTeamviewer from "./teamviewer.svg?no-inline";
import iconWebex from "./webex.svg?no-inline";
import iconDocusign from "./docusign.svg?no-inline";
import iconTrello from "./trello.svg?no-inline";
import iconAsana from "./asana.svg?no-inline";
import iconMalwarebytes from "./malwarebytes.svg?no-inline";

export interface ProductIconDefinition {
  id: string;
  name: string;
  keywords: string;
  src: string;
  wordmark?: boolean;
}

export const PRODUCT_ICONS = [
  { id: "generic", name: "General", keywords: "software app product כללי מוצר תוכנה", src: iconGeneric },
  { id: "cloud", name: "Cloud", keywords: "cloud hosting services ענן אחסון", src: iconCloud },
  { id: "security", name: "Security", keywords: "security shield protection antivirus אבטחה הגנה אנטי וירוס", src: iconSecurity },
  { id: "database", name: "Database", keywords: "database storage backup data מסד נתונים גיבוי", src: iconDatabase },
  { id: "server", name: "Server", keywords: "server infrastructure hardware networking שרת תשתית", src: iconServer },
  { id: "email", name: "Email", keywords: "email mail communication inbox דואר מייל תקשורת", src: iconEmail },
  { id: "development", name: "Development", keywords: "development code tools programming פיתוח קוד תכנות", src: iconDevelopment },
  { id: "design", name: "Design", keywords: "design creative drawing graphics עיצוב גרפיקה", src: iconDesign },
  { id: "microsoft-365", name: "Microsoft 365", keywords: "365 m365 o365 office microsoft productivity suite מיקרוסופט אופיס", src: iconMicrosoftoffice },
  { id: "microsoft", name: "Microsoft / Windows", keywords: "microsoft ms software windows desktop operating system מיקרוסופט ווינדוס חלונות", src: iconMicrosoft },
  { id: "azure", name: "Microsoft Azure", keywords: "azure cloud microsoft אז׳ור אזור מיקרוסופט", src: iconMicrosoftazure },
  { id: "teams", name: "Microsoft Teams", keywords: "teams meetings collaboration microsoft טימס מיקרוסופט", src: iconMicrosoftteams },
  { id: "outlook", name: "Microsoft Outlook", keywords: "outlook email calendar microsoft אאוטלוק מיקרוסופט", src: iconMicrosoftoutlook },
  { id: "onedrive", name: "Microsoft OneDrive", keywords: "onedrive files storage microsoft וואן דרייב מיקרוסופט", src: iconMicrosoftonedrive },
  { id: "sharepoint", name: "Microsoft SharePoint", keywords: "sharepoint intranet documents microsoft שיירפוינט מיקרוסופט", src: iconMicrosoftsharepoint },
  { id: "exchange", name: "Microsoft Exchange", keywords: "exchange email microsoft אקסצ׳יינג׳ מיקרוסופט", src: iconMicrosoftexchange },
  { id: "power-bi", name: "Power BI", keywords: "power bi analytics reporting microsoft פאוור בי מיקרוסופט", src: iconPowerbi },
  { id: "acronis", name: "Acronis", keywords: "acronis acronix backup recovery cyber protect security אקרוניס אקרוניקס", src: iconAcronis },
  { id: "adobe", name: "Adobe", keywords: "adobe design creative אדובי", src: iconAdobe },
  { id: "adobe-acrobat", name: "Adobe Acrobat", keywords: "adobe acrobat reader pdf אדובי אקרובט", src: iconAdobeacrobatreader },
  { id: "creative-cloud", name: "Adobe Creative Cloud", keywords: "adobe creative cloud cc design אדובי קריאייטיב קלאוד", src: iconAdobecreativecloud },
  { id: "photoshop", name: "Adobe Photoshop", keywords: "adobe photoshop photo image editing אדובי פוטושופ", src: iconAdobephotoshop },
  { id: "illustrator", name: "Adobe Illustrator", keywords: "adobe illustrator vector design אדובי אילוסטרייטור", src: iconAdobeillustrator },
  { id: "google", name: "Google / Workspace", keywords: "google search workspace g suite gsuite productivity גוגל וורקספייס", src: iconGoogle },
  { id: "google-drive", name: "Google Drive", keywords: "google drive storage files גוגל דרייב", src: iconGoogledrive },
  { id: "gmail", name: "Gmail", keywords: "gmail google email ג׳ימייל גימייל גוגל", src: iconGmail },
  { id: "google-cloud", name: "Google Cloud", keywords: "google cloud gcp hosting גוגל ענן", src: iconGooglecloud },
  { id: "google-meet", name: "Google Meet", keywords: "google meet video meetings גוגל מיט", src: iconGooglemeet },
  { id: "google-docs", name: "Google Docs", keywords: "google docs documents גוגל דוקס", src: iconGoogledocs },
  { id: "google-sheets", name: "Google Sheets", keywords: "google sheets spreadsheets גוגל שיטס", src: iconGooglesheets },
  { id: "zoom", name: "Zoom", keywords: "zoom workplace video meetings זום", src: iconZoom },
  { id: "slack", name: "Slack", keywords: "slack chat collaboration סלאק", src: iconSlack },
  { id: "dropbox", name: "Dropbox", keywords: "dropbox storage files backup דרופבוקס", src: iconDropbox },
  { id: "atlassian", name: "Atlassian", keywords: "atlassian collaboration projects אטלסיאן", src: iconAtlassian },
  { id: "jira", name: "Jira", keywords: "jira atlassian issues projects ג׳ירה גירה", src: iconJira },
  { id: "confluence", name: "Confluence", keywords: "confluence atlassian wiki knowledge קונפלואנס", src: iconConfluence },
  { id: "notion", name: "Notion", keywords: "notion notes documents workspace נושן", src: iconNotion },
  { id: "figma", name: "Figma", keywords: "figma design prototype פיגמה", src: iconFigma },
  { id: "canva", name: "Canva", keywords: "canva design graphics קנבה קנווה", src: iconCanva },
  { id: "github", name: "GitHub", keywords: "github development git code גיטהאב", src: iconGithub },
  { id: "gitlab", name: "GitLab", keywords: "gitlab development git code גיטלאב", src: iconGitlab },
  { id: "docker", name: "Docker", keywords: "docker development containers דוקר", src: iconDocker },
  { id: "aws", name: "Amazon Web Services", keywords: "aws amazon web services cloud אמזון", src: iconAmazonaws },
  { id: "cloudflare", name: "Cloudflare", keywords: "cloudflare cloud security networking קלאודפלייר", src: iconCloudflare },
  { id: "salesforce", name: "Salesforce", keywords: "salesforce crm sales סיילספורס", src: iconSalesforce },
  { id: "hubspot", name: "HubSpot", keywords: "hubspot crm sales marketing האבספוט", src: iconHubspot },
  { id: "veeam", name: "Veeam", keywords: "veeam backup recovery וים ויאם", src: iconVeeam, wordmark: true },
  { id: "vmware", name: "VMware", keywords: "vmware virtualization vsphere וימוור", src: iconVmware, wordmark: true },
  { id: "sentinelone", name: "SentinelOne", keywords: "sentinelone sentinel one sentinel1 endpoint security xdr edr סנטינלוואן סנטינל וואן", src: iconSentinelone },
  { id: "bittitan", name: "BitTitan", keywords: "bittitan bit titan migrationwiz migration wiz cloud migration ביטטיטאן ביט טיטאן ביטטיטן", src: iconBittitan },
  { id: "bitdefender", name: "Bitdefender", keywords: "bitdefender antivirus endpoint security ביטדיפנדר", src: iconBitdefender },
  { id: "fortinet", name: "Fortinet", keywords: "fortinet fortigate firewall security פורטינט פורטיגייט", src: iconFortinet },
  { id: "autodesk", name: "Autodesk", keywords: "autodesk autocad cad design אוטודסק אוטוקאד", src: iconAutodesk },
  { id: "cisco", name: "Cisco", keywords: "cisco networking security סיסקו", src: iconCisco },
  { id: "okta", name: "Okta", keywords: "okta identity authentication sso אוקטה", src: iconOkta },
  { id: "1password", name: "1Password", keywords: "1password passwords security וואן פסוורד", src: icon1password },
  { id: "teamviewer", name: "TeamViewer", keywords: "teamviewer remote support טים ויואר", src: iconTeamviewer },
  { id: "webex", name: "Webex", keywords: "webex cisco meetings video וובקס", src: iconWebex },
  { id: "docusign", name: "DocuSign", keywords: "docusign esign signature documents דוקוסיין", src: iconDocusign },
  { id: "trello", name: "Trello", keywords: "trello atlassian boards projects טרלו", src: iconTrello },
  { id: "asana", name: "Asana", keywords: "asana projects tasks אסאנה", src: iconAsana },
  { id: "malwarebytes", name: "Malwarebytes", keywords: "malwarebytes antivirus endpoint security מלוורבייטס", src: iconMalwarebytes },
] as const satisfies readonly ProductIconDefinition[];

export type ProductIconId = (typeof PRODUCT_ICONS)[number]["id"];
export const DEFAULT_PRODUCT_ICON = PRODUCT_ICONS[0];

// Keep saved catalogs using the same artwork after duplicate choices are consolidated.
const LEGACY_ICON_IDS: ReadonlyMap<string, ProductIconId> = new Map([
  ["google-workspace", "google"],
  ["windows", "microsoft"],
]);

export function findProductIcon(id: unknown): ProductIconDefinition | undefined {
  if (typeof id !== "string") return undefined;
  const canonicalId = LEGACY_ICON_IDS.get(id) ?? id;
  return PRODUCT_ICONS.find((icon) => icon.id === canonicalId);
}

// Match complete brand words, with specific product names ahead of broad vendors.
const SUGGESTIONS: ReadonlyArray<readonly [string, ProductIconId]> = [
  ["adobe creative cloud", "creative-cloud"],
  ["microsoft sharepoint", "sharepoint"],
  ["amazon web services", "aws"],
  ["microsoft exchange", "exchange"],
  ["microsoft onedrive", "onedrive"],
  ["adobe illustrator", "illustrator"],
  ["microsoft outlook", "outlook"],
  ["google workspace", "google"],
  ["microsoft office", "microsoft-365"],
  ["adobe photoshop", "photoshop"],
  ["microsoft azure", "azure"],
  ["microsoft teams", "teams"],
  ["acrobat reader", "adobe-acrobat"],
  ["creative cloud", "creative-cloud"],
  ["adobe acrobat", "adobe-acrobat"],
  ["google sheets", "google-sheets"],
  ["microsoft 365", "microsoft-365"],
  ["google cloud", "google-cloud"],
  ["google drive", "google-drive"],
  ["malwarebytes", "malwarebytes"],
  ["sentinel one", "sentinelone"],
  ["sentinelone", "sentinelone"],
  ["סנטינל וואן", "sentinelone"],
  ["סנטינלוואן", "sentinelone"],
  ["migrationwiz", "bittitan"],
  ["migration wiz", "bittitan"],
  ["ביט טיטאן", "bittitan"],
  ["microsoft365", "microsoft-365"],
  ["bitdefender", "bitdefender"],
  ["google docs", "google-docs"],
  ["google meet", "google-meet"],
  ["illustrator", "illustrator"],
  ["cloudflare", "cloudflare"],
  ["confluence", "confluence"],
  ["office 365", "microsoft-365"],
  ["salesforce", "salesforce"],
  ["sharepoint", "sharepoint"],
  ["teamviewer", "teamviewer"],
  ["1password", "1password"],
  ["atlassian", "atlassian"],
  ["sentinel1", "sentinelone"],
  ["bit titan", "bittitan"],
  ["bittitan", "bittitan"],
  ["ביטטיטאן", "bittitan"],
  ["ביטטיטן", "bittitan"],
  ["fortigate", "fortinet"],
  ["microsoft", "microsoft"],
  ["office365", "microsoft-365"],
  ["one drive", "onedrive"],
  ["photoshop", "photoshop"],
  ["autodesk", "autodesk"],
  ["docusign", "docusign"],
  ["exchange", "exchange"],
  ["fortinet", "fortinet"],
  ["onedrive", "onedrive"],
  ["power bi", "power-bi"],
  ["acrobat", "adobe-acrobat"],
  ["acronis", "acronis"],
  ["acronix", "acronis"],
  ["autocad", "autodesk"],
  ["dropbox", "dropbox"],
  ["g suite", "google"],
  ["hubspot", "hubspot"],
  ["outlook", "outlook"],
  ["vsphere", "vmware"],
  ["windows", "microsoft"],
  ["docker", "docker"],
  ["github", "github"],
  ["gitlab", "gitlab"],
  ["google", "google"],
  ["gsuite", "google"],
  ["notion", "notion"],
  ["trello", "trello"],
  ["vmware", "vmware"],
  ["adobe", "adobe"],
  ["asana", "asana"],
  ["azure", "azure"],
  ["canva", "canva"],
  ["cisco", "cisco"],
  ["figma", "figma"],
  ["gmail", "gmail"],
  ["slack", "slack"],
  ["teams", "teams"],
  ["veeam", "veeam"],
  ["webex", "webex"],
  ["jira", "jira"],
  ["m365", "microsoft-365"],
  ["o365", "microsoft-365"],
  ["okta", "okta"],
  ["zoom", "zoom"],
  ["365", "microsoft-365"],
  ["aws", "aws"],
  ["gcp", "google-cloud"],
];

export function suggestProductIcon(name: string): ProductIconId {
  const words = ` ${name.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  return SUGGESTIONS.find(([alias]) => words.includes(` ${alias} `))?.[1] ?? "generic";
}
