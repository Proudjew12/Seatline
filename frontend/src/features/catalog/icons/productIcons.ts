import type { ProductIconCategoryId } from "./productIconCategories";
import { PRODUCT_ICON_ALIASES } from "./productIconAliases";

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

import iconTrendMicro from "./trendmicro.svg?no-inline";
import iconPaloAlto from "./paloaltonetworks.svg?no-inline";
import iconBitwarden from "./bitwarden.svg?no-inline";
import iconDatto from "./datto.svg?no-inline";
import iconBackblaze from "./backblaze.svg?no-inline";
import iconWasabi from "./wasabi.svg?no-inline";
import iconAnydesk from "./anydesk.svg?no-inline";
import iconProxmox from "./proxmox.svg?no-inline";
import iconNutanix from "./nutanix.svg?no-inline";
import iconSynology from "./synology.svg?no-inline";
import iconQnap from "./qnap.svg?no-inline";
import iconUbiquiti from "./ubiquiti.svg?no-inline";
import iconRedHat from "./redhat.svg?no-inline";
import iconUbuntu from "./ubuntu.svg?no-inline";
import iconDigitalocean from "./digitalocean.svg?no-inline";
import iconZoho from "./zoho.svg?no-inline";
import iconJetbrains from "./jetbrains.svg?no-inline";
import iconPostman from "./postman.svg?no-inline";
import iconDatadog from "./datadog.svg?no-inline";
import iconSentry from "./sentry.svg?no-inline";
import iconAvast from "./avast.svg?no-inline";
import iconAvira from "./avira.svg?no-inline";
import iconNordvpn from "./nordvpn.svg?no-inline";
import iconOpenvpn from "./openvpn.svg?no-inline";
import iconWireguard from "./wireguard.svg?no-inline";
import iconTailscale from "./tailscale.svg?no-inline";
import iconSnyk from "./snyk.svg?no-inline";
import iconSplunk from "./splunk.svg?no-inline";
import iconNewRelic from "./newrelic.svg?no-inline";
import iconGrafana from "./grafana.svg?no-inline";
import iconEset from "./eset.svg?no-inline";
import iconCrowdstrike from "./crowdstrike.svg?no-inline";
import iconCheckpoint from "./checkpoint.svg?no-inline";
import iconZscaler from "./zscaler.svg?no-inline";
import iconProofpoint from "./proofpoint.svg?no-inline";
import iconDuo from "./duo.svg?no-inline";
import iconKeeper from "./keeper.svg?no-inline";
import iconSharegate from "./sharegate.svg?no-inline";
import iconConnectwise from "./connectwise.svg?no-inline";
import iconJamf from "./jamf.svg?no-inline";
import iconWatchguard from "./watchguard.svg?no-inline";
import iconCommvault from "./commvault.svg?no-inline";
import iconMsp360 from "./msp360.svg?no-inline";
import iconFreshworks from "./freshworks.webp?no-inline";

export interface ProductIconDefinition {
  id: string;
  name: string;
  keywords: string;
  category: ProductIconCategoryId;
  src: string;
  wordmark?: boolean;
}

export const PRODUCT_ICONS = [
  { id: "generic", name: "General", category: "general", keywords: "software app product כללי מוצר תוכנה", src: iconGeneric },
  { id: "cloud", name: "Cloud", category: "general", keywords: "cloud hosting services ענן אחסון", src: iconCloud },
  { id: "security", name: "Security", category: "general", keywords: "security shield protection antivirus אבטחה הגנה אנטי וירוס", src: iconSecurity },
  { id: "database", name: "Database", category: "general", keywords: "database storage backup data מסד נתונים גיבוי", src: iconDatabase },
  { id: "server", name: "Server", category: "general", keywords: "server infrastructure hardware networking שרת תשתית", src: iconServer },
  { id: "email", name: "Email", category: "general", keywords: "email mail communication inbox דואר מייל תקשורת", src: iconEmail },
  { id: "development", name: "Development", category: "general", keywords: "development code tools programming פיתוח קוד תכנות", src: iconDevelopment },
  { id: "design", name: "Design", category: "general", keywords: "design creative drawing graphics עיצוב גרפיקה", src: iconDesign },
  { id: "microsoft-365", name: "Microsoft 365", category: "productivity", keywords: "365 m365 o365 office microsoft productivity suite מיקרוסופט אופיס", src: iconMicrosoftoffice },
  { id: "microsoft", name: "Microsoft / Windows", category: "infrastructure", keywords: "microsoft ms software windows desktop operating system מיקרוסופט ווינדוס חלונות", src: iconMicrosoft },
  { id: "azure", name: "Microsoft Azure", category: "infrastructure", keywords: "azure cloud microsoft אז׳ור אזור מיקרוסופט", src: iconMicrosoftazure },
  { id: "teams", name: "Microsoft Teams", category: "collaboration", keywords: "teams meetings collaboration microsoft טימס מיקרוסופט", src: iconMicrosoftteams },
  { id: "outlook", name: "Microsoft Outlook", category: "productivity", keywords: "outlook email calendar microsoft אאוטלוק מיקרוסופט", src: iconMicrosoftoutlook },
  { id: "onedrive", name: "Microsoft OneDrive", category: "productivity", keywords: "onedrive files storage microsoft וואן דרייב מיקרוסופט", src: iconMicrosoftonedrive },
  { id: "sharepoint", name: "Microsoft SharePoint", category: "collaboration", keywords: "sharepoint intranet documents microsoft שיירפוינט מיקרוסופט", src: iconMicrosoftsharepoint },
  { id: "exchange", name: "Microsoft Exchange", category: "productivity", keywords: "exchange email microsoft אקסצ׳יינג׳ מיקרוסופט", src: iconMicrosoftexchange },
  { id: "power-bi", name: "Power BI", category: "business", keywords: "power bi analytics reporting microsoft פאוור בי מיקרוסופט", src: iconPowerbi },
  { id: "acronis", name: "Acronis", category: "backup", keywords: "acronis acronix backup recovery cyber protect security אקרוניס אקרוניקס", src: iconAcronis },
  { id: "adobe", name: "Adobe", category: "design", keywords: "adobe design creative אדובי", src: iconAdobe },
  { id: "adobe-acrobat", name: "Adobe Acrobat", category: "design", keywords: "adobe acrobat reader pdf אדובי אקרובט", src: iconAdobeacrobatreader },
  { id: "creative-cloud", name: "Adobe Creative Cloud", category: "design", keywords: "adobe creative cloud cc design אדובי קריאייטיב קלאוד", src: iconAdobecreativecloud },
  { id: "photoshop", name: "Adobe Photoshop", category: "design", keywords: "adobe photoshop photo image editing אדובי פוטושופ", src: iconAdobephotoshop },
  { id: "illustrator", name: "Adobe Illustrator", category: "design", keywords: "adobe illustrator vector design אדובי אילוסטרייטור", src: iconAdobeillustrator },
  { id: "google", name: "Google / Workspace", category: "productivity", keywords: "google search workspace g suite gsuite productivity גוגל וורקספייס", src: iconGoogle },
  { id: "google-drive", name: "Google Drive", category: "productivity", keywords: "google drive storage files גוגל דרייב", src: iconGoogledrive },
  { id: "gmail", name: "Gmail", category: "productivity", keywords: "gmail google email ג׳ימייל גימייל גוגל", src: iconGmail },
  { id: "google-cloud", name: "Google Cloud", category: "infrastructure", keywords: "google cloud gcp hosting גוגל ענן", src: iconGooglecloud },
  { id: "google-meet", name: "Google Meet", category: "collaboration", keywords: "google meet video meetings גוגל מיט", src: iconGooglemeet },
  { id: "google-docs", name: "Google Docs", category: "productivity", keywords: "google docs documents גוגל דוקס", src: iconGoogledocs },
  { id: "google-sheets", name: "Google Sheets", category: "productivity", keywords: "google sheets spreadsheets גוגל שיטס", src: iconGooglesheets },
  { id: "zoom", name: "Zoom", category: "collaboration", keywords: "zoom workplace video meetings זום", src: iconZoom },
  { id: "slack", name: "Slack", category: "collaboration", keywords: "slack chat collaboration סלאק", src: iconSlack },
  { id: "dropbox", name: "Dropbox", category: "backup", keywords: "dropbox storage files backup דרופבוקס", src: iconDropbox },
  { id: "atlassian", name: "Atlassian", category: "collaboration", keywords: "atlassian collaboration projects אטלסיאן", src: iconAtlassian },
  { id: "jira", name: "Jira", category: "collaboration", keywords: "jira atlassian issues projects ג׳ירה גירה", src: iconJira },
  { id: "confluence", name: "Confluence", category: "collaboration", keywords: "confluence atlassian wiki knowledge קונפלואנס", src: iconConfluence },
  { id: "notion", name: "Notion", category: "collaboration", keywords: "notion notes documents workspace נושן", src: iconNotion },
  { id: "figma", name: "Figma", category: "design", keywords: "figma design prototype פיגמה", src: iconFigma },
  { id: "canva", name: "Canva", category: "design", keywords: "canva design graphics קנבה קנווה", src: iconCanva },
  { id: "github", name: "GitHub", category: "development", keywords: "github development git code גיטהאב", src: iconGithub },
  { id: "gitlab", name: "GitLab", category: "development", keywords: "gitlab development git code גיטלאב", src: iconGitlab },
  { id: "docker", name: "Docker", category: "development", keywords: "docker development containers דוקר", src: iconDocker },
  { id: "aws", name: "Amazon Web Services", category: "infrastructure", keywords: "aws amazon web services cloud אמזון", src: iconAmazonaws },
  { id: "cloudflare", name: "Cloudflare", category: "infrastructure", keywords: "cloudflare cloud security networking קלאודפלייר", src: iconCloudflare },
  { id: "salesforce", name: "Salesforce", category: "business", keywords: "salesforce crm sales סיילספורס", src: iconSalesforce },
  { id: "hubspot", name: "HubSpot", category: "business", keywords: "hubspot crm sales marketing האבספוט", src: iconHubspot },
  { id: "veeam", name: "Veeam", category: "backup", keywords: "veeam backup recovery וים ויאם", src: iconVeeam, wordmark: true },
  { id: "vmware", name: "VMware", category: "infrastructure", keywords: "vmware virtualization vsphere וימוור", src: iconVmware, wordmark: true },
  { id: "sentinelone", name: "SentinelOne", category: "security", keywords: "sentinelone sentinalone sentinel one sentinel1 endpoint security xdr edr סנטינלוואן סנטינל וואן", src: iconSentinelone },
  { id: "bittitan", name: "BitTitan", category: "backup", keywords: "bittitan bit titan migrationwiz migration wiz cloud migration ביטטיטאן ביט טיטאן ביטטיטן", src: iconBittitan },
  { id: "bitdefender", name: "Bitdefender", category: "security", keywords: "bitdefender antivirus endpoint security ביטדיפנדר", src: iconBitdefender },
  { id: "fortinet", name: "Fortinet", category: "security", keywords: "fortinet fortigate firewall security פורטינט פורטיגייט", src: iconFortinet },
  { id: "autodesk", name: "Autodesk", category: "design", keywords: "autodesk autocad cad design אוטודסק אוטוקאד", src: iconAutodesk },
  { id: "cisco", name: "Cisco", category: "infrastructure", keywords: "cisco networking security סיסקו", src: iconCisco },
  { id: "okta", name: "Okta", category: "security", keywords: "okta identity authentication sso אוקטה", src: iconOkta },
  { id: "1password", name: "1Password", category: "security", keywords: "1password passwords security וואן פסוורד", src: icon1password },
  { id: "teamviewer", name: "TeamViewer", category: "infrastructure", keywords: "teamviewer remote support טים ויואר", src: iconTeamviewer },
  { id: "webex", name: "Webex", category: "collaboration", keywords: "webex cisco meetings video וובקס", src: iconWebex },
  { id: "docusign", name: "DocuSign", category: "design", keywords: "docusign esign signature documents דוקוסיין", src: iconDocusign },
  { id: "trello", name: "Trello", category: "collaboration", keywords: "trello atlassian boards projects טרלו", src: iconTrello },
  { id: "asana", name: "Asana", category: "collaboration", keywords: "asana projects tasks אסאנה", src: iconAsana },
  { id: "malwarebytes", name: "Malwarebytes", category: "security", keywords: "malwarebytes antivirus endpoint security מלוורבייטס", src: iconMalwarebytes },
  { id: "trend-micro", name: "Trend Micro", category: "security", keywords: "trend micro endpoint antivirus טרנד מיקרו", src: iconTrendMicro },
  { id: "palo-alto", name: "Palo Alto Networks", category: "security", keywords: "palo alto networks firewall prisma cortex פאלו אלטו", src: iconPaloAlto },
  { id: "bitwarden", name: "Bitwarden", category: "security", keywords: "bitwarden password vault ביטוורדן", src: iconBitwarden },
  { id: "datto", name: "Datto", category: "backup", keywords: "datto backup recovery rmm דאטו", src: iconDatto, wordmark: true },
  { id: "backblaze", name: "Backblaze", category: "backup", keywords: "backblaze b2 backup storage בקבלייז", src: iconBackblaze },
  { id: "wasabi", name: "Wasabi", category: "backup", keywords: "wasabi cloud object storage וסאבי", src: iconWasabi },
  { id: "anydesk", name: "AnyDesk", category: "infrastructure", keywords: "anydesk remote access support אנידסק", src: iconAnydesk },
  { id: "proxmox", name: "Proxmox", category: "infrastructure", keywords: "proxmox virtualization hypervisor proxmox ve פרוקסמוקס", src: iconProxmox },
  { id: "nutanix", name: "Nutanix", category: "infrastructure", keywords: "nutanix virtualization hci נוטניקס", src: iconNutanix },
  { id: "synology", name: "Synology", category: "infrastructure", keywords: "synology nas storage diskstation סינולוגי", src: iconSynology, wordmark: true },
  { id: "qnap", name: "QNAP", category: "infrastructure", keywords: "qnap nas storage קיונאפ", src: iconQnap, wordmark: true },
  { id: "ubiquiti", name: "Ubiquiti", category: "infrastructure", keywords: "ubiquiti unifi networking יוביקוויטי יוניפיי", src: iconUbiquiti },
  { id: "red-hat", name: "Red Hat", category: "infrastructure", keywords: "red hat linux rhel רד האט", src: iconRedHat },
  { id: "ubuntu", name: "Ubuntu", category: "infrastructure", keywords: "ubuntu linux canonical אובונטו", src: iconUbuntu },
  { id: "digitalocean", name: "DigitalOcean", category: "infrastructure", keywords: "digitalocean cloud hosting droplets דיגיטל אושן", src: iconDigitalocean },
  { id: "zoho", name: "Zoho", category: "business", keywords: "zoho crm business זוהו", src: iconZoho },
  { id: "jetbrains", name: "JetBrains", category: "development", keywords: "jetbrains intellij pycharm webstorm rider ג׳טבריינס גטבריינס", src: iconJetbrains },
  { id: "postman", name: "Postman", category: "development", keywords: "postman api testing פוסטמן", src: iconPostman },
  { id: "datadog", name: "Datadog", category: "development", keywords: "datadog monitoring observability דטהדוג דאטאדוג", src: iconDatadog },
  { id: "sentry", name: "Sentry", category: "development", keywords: "sentry errors monitoring סנטרי", src: iconSentry },
  { id: "avast", name: "Avast", category: "security", keywords: "avast antivirus endpoint אווסט", src: iconAvast },
  { id: "avira", name: "Avira", category: "security", keywords: "avira antivirus אווירה", src: iconAvira },
  { id: "nordvpn", name: "NordVPN", category: "security", keywords: "nordvpn vpn privacy nord layer נורד וי פי אן", src: iconNordvpn },
  { id: "openvpn", name: "OpenVPN", category: "security", keywords: "openvpn vpn networking אופן וי פי אן", src: iconOpenvpn },
  { id: "wireguard", name: "WireGuard", category: "security", keywords: "wireguard vpn tunnel וויירגארד", src: iconWireguard },
  { id: "tailscale", name: "Tailscale", category: "security", keywords: "tailscale vpn mesh networking טיילסקייל", src: iconTailscale },
  { id: "snyk", name: "Snyk", category: "security", keywords: "snyk appsec code security סניק", src: iconSnyk },
  { id: "splunk", name: "Splunk", category: "business", keywords: "splunk logs analytics siem ספלנק", src: iconSplunk, wordmark: true },
  { id: "new-relic", name: "New Relic", category: "development", keywords: "new relic monitoring observability ניו רליק", src: iconNewRelic },
  { id: "grafana", name: "Grafana", category: "development", keywords: "grafana monitoring dashboards גרפנה", src: iconGrafana },
  { id: "eset", name: "ESET", category: "security", keywords: "eset nod32 protect eset protect איסט נוד32", src: iconEset, wordmark: true },
  { id: "crowdstrike", name: "CrowdStrike", category: "security", keywords: "crowdstrike crowd strike falcon endpoint edr xdr קראודסטרייק קראוד סטרייק", src: iconCrowdstrike },
  { id: "checkpoint", name: "Check Point", category: "security", keywords: "check point checkpoint harmony quantum firewall צ׳ק פוינט צק פוינט צקפוינט", src: iconCheckpoint },
  { id: "zscaler", name: "Zscaler", category: "security", keywords: "zscaler zero trust sse זיסקיילר זי סקיילר", src: iconZscaler },
  { id: "proofpoint", name: "Proofpoint", category: "security", keywords: "proofpoint email security פרופפוינט פרוף פוינט", src: iconProofpoint },
  { id: "duo", name: "Duo", category: "security", keywords: "duo cisco duo mfa authentication דואו דואו סיסקו", src: iconDuo, wordmark: true },
  { id: "keeper", name: "Keeper", category: "security", keywords: "keeper keeper security password manager vault קיפר", src: iconKeeper },
  { id: "sharegate", name: "ShareGate", category: "backup", keywords: "sharegate share gate migration microsoft 365 sharepoint שיירגייט שייר גייט", src: iconSharegate },
  { id: "connectwise", name: "ConnectWise", category: "infrastructure", keywords: "connectwise connect wise screenconnect automate rmm psa קונקטווייז קונקט ווייז", src: iconConnectwise, wordmark: true },
  { id: "jamf", name: "Jamf", category: "infrastructure", keywords: "jamf apple mdm device management ג׳אמף גאמף", src: iconJamf },
  { id: "watchguard", name: "WatchGuard", category: "security", keywords: "watchguard watch guard firewall firebox וואטשגארד ווטשגארד", src: iconWatchguard },
  { id: "commvault", name: "Commvault", category: "backup", keywords: "commvault backup recovery cyber resilience קומוולט קום וולט", src: iconCommvault },
  { id: "msp360", name: "MSP360", category: "backup", keywords: "msp360 msp 360 cloudberry cloud berry backup אמ אס פי 360 קלאודברי", src: iconMsp360, wordmark: true },
  { id: "freshworks", name: "Freshworks", category: "business", keywords: "freshworks freshdesk freshservice crm helpdesk פרשוורקס פרש דסק פרש סרוויס", src: iconFreshworks },
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

// Normalize both labels and aliases so punctuation never creates partial-word matches.
function normalizeIconName(name: string): string {
  return name.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const SUGGESTIONS: ReadonlyArray<readonly [string, ProductIconId]> = [
  ...PRODUCT_ICON_ALIASES,
  ...PRODUCT_ICONS.filter((icon) => icon.category !== "general")
    .map((icon) => [icon.name, icon.id] as const),
].map(([alias, id]) => [normalizeIconName(alias), id] as const)
  .sort(([left], [right]) => right.length - left.length);

export function suggestProductIcon(name: string): ProductIconId {
  const words = ` ${normalizeIconName(name)} `;
  return SUGGESTIONS.find(([alias]) => words.includes(` ${alias} `))?.[1] ?? "generic";
}
