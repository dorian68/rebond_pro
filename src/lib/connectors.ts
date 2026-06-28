export type ConnectorKey =
  | "google_calendar"
  | "google_drive"
  | "gmail"
  | "outlook"
  | "onedrive"
  | "sharepoint"
  | "microsoft_calendar";

export type ConnectorCapability = "calendar_read" | "document_read" | "document_import" | "email_draft" | "email_send";
export type ConnectorToolKind = "listEvents" | "searchFiles" | "getFile" | "createDraft" | "sendEmail";
export type ConnectorScope = "personal" | "organization";

export type ConnectorDefinition = {
  key: ConnectorKey;
  label: string;
  provider: "google" | "microsoft";
  toolkit: string;
  priority: number;
  capabilities: ConnectorCapability[];
  scopes: ConnectorScope[];
  defaultScope: ConnectorScope;
  writePolicy: "READ_ONLY" | "DRAFT_ONLY" | "SEND";
  description: string;
  envToolOverrides: Partial<Record<ConnectorToolKind, string>>;
};

export const CONNECTORS: ConnectorDefinition[] = [
  {
    key: "google_calendar",
    label: "Google Calendar",
    provider: "google",
    toolkit: "googlecalendar",
    priority: 1,
    capabilities: ["calendar_read"],
    scopes: ["personal", "organization"],
    defaultScope: "personal",
    writePolicy: "READ_ONLY",
    description: "Lecture des disponibilités et événements pour aider Socrate à proposer des créneaux.",
    envToolOverrides: { listEvents: "COMPOSIO_TOOL_GOOGLE_CALENDAR_LIST_EVENTS" },
  },
  {
    key: "google_drive",
    label: "Google Drive",
    provider: "google",
    toolkit: "googledrive",
    priority: 2,
    capabilities: ["document_read", "document_import"],
    scopes: ["organization", "personal"],
    defaultScope: "organization",
    writePolicy: "READ_ONLY",
    description: "Recherche et import contrôlé de documents utiles aux formulaires, modèles et sessions.",
    envToolOverrides: { searchFiles: "COMPOSIO_TOOL_GOOGLE_DRIVE_SEARCH_FILES", getFile: "COMPOSIO_TOOL_GOOGLE_DRIVE_GET_FILE" },
  },
  {
    key: "gmail",
    label: "Gmail",
    provider: "google",
    toolkit: "gmail",
    priority: 3,
    capabilities: ["email_draft", "email_send"],
    scopes: ["personal"],
    defaultScope: "personal",
    writePolicy: "SEND",
    description: "Création de brouillons et envoi d'emails. L'envoi déclenche une validation humaine avant exécution.",
    envToolOverrides: { createDraft: "COMPOSIO_TOOL_GMAIL_CREATE_DRAFT", sendEmail: "COMPOSIO_TOOL_GMAIL_SEND_EMAIL" },
  },
  {
    key: "outlook",
    label: "Outlook Mail",
    provider: "microsoft",
    toolkit: "outlook",
    priority: 4,
    capabilities: ["email_draft", "email_send"],
    scopes: ["personal"],
    defaultScope: "personal",
    writePolicy: "SEND",
    description: "Création de brouillons et envoi d'emails Outlook. L'envoi déclenche une validation humaine avant exécution.",
    envToolOverrides: { createDraft: "COMPOSIO_TOOL_OUTLOOK_CREATE_DRAFT", sendEmail: "COMPOSIO_TOOL_OUTLOOK_SEND_EMAIL" },
  },
  {
    key: "onedrive",
    label: "OneDrive",
    provider: "microsoft",
    toolkit: "onedrive",
    priority: 5,
    capabilities: ["document_read", "document_import"],
    scopes: ["organization", "personal"],
    defaultScope: "organization",
    writePolicy: "READ_ONLY",
    description: "Recherche et import contrôlé de fichiers OneDrive.",
    envToolOverrides: { searchFiles: "COMPOSIO_TOOL_ONEDRIVE_SEARCH_FILES", getFile: "COMPOSIO_TOOL_ONEDRIVE_GET_FILE" },
  },
  {
    key: "sharepoint",
    label: "SharePoint",
    provider: "microsoft",
    toolkit: "sharepoint",
    priority: 6,
    capabilities: ["document_read", "document_import"],
    scopes: ["organization", "personal"],
    defaultScope: "organization",
    writePolicy: "READ_ONLY",
    description: "Recherche et import contrôlé de documents SharePoint.",
    envToolOverrides: { searchFiles: "COMPOSIO_TOOL_SHAREPOINT_SEARCH_FILES", getFile: "COMPOSIO_TOOL_SHAREPOINT_GET_FILE" },
  },
  {
    key: "microsoft_calendar",
    label: "Microsoft Calendar",
    provider: "microsoft",
    toolkit: "outlook",
    priority: 7,
    capabilities: ["calendar_read"],
    scopes: ["personal", "organization"],
    defaultScope: "personal",
    writePolicy: "READ_ONLY",
    description: "Lecture des événements Microsoft 365 via Outlook Calendar.",
    envToolOverrides: { listEvents: "COMPOSIO_TOOL_MICROSOFT_CALENDAR_LIST_EVENTS" },
  },
];

export const DEFAULT_COMPOSIO_TOOLS: Record<ConnectorKey, Partial<Record<ConnectorToolKind, string>>> = {
  google_calendar: { listEvents: "GOOGLECALENDAR_EVENTS_LIST" },
  google_drive: { searchFiles: "GOOGLEDRIVE_SEARCH_FILES", getFile: "GOOGLEDRIVE_GET_FILE" },
  gmail: { createDraft: "GMAIL_CREATE_EMAIL_DRAFT", sendEmail: "GMAIL_SEND_EMAIL" },
  outlook: { createDraft: "OUTLOOK_CREATE_EMAIL_DRAFT", sendEmail: "OUTLOOK_SEND_EMAIL" },
  onedrive: { searchFiles: "ONEDRIVE_SEARCH_FILES", getFile: "ONEDRIVE_GET_FILE" },
  sharepoint: { searchFiles: "SHAREPOINT_SEARCH_FILES", getFile: "SHAREPOINT_GET_FILE" },
  microsoft_calendar: { listEvents: "OUTLOOK_LIST_EVENTS" },
};

export function getConnector(key: string): ConnectorDefinition | undefined {
  return CONNECTORS.find((c) => c.key === key);
}

export function resolveComposioTool(connector: ConnectorDefinition, kind: ConnectorToolKind): string | null {
  const envName = connector.envToolOverrides[kind];
  const override = envName ? process.env[envName] : undefined;
  return override || DEFAULT_COMPOSIO_TOOLS[connector.key][kind] || null;
}

export function connectorUserId(userId: string) {
  return `lbr_user_${userId}`;
}

export function connectorOrganizationId(organizationId: string) {
  return `lbr_org_${organizationId}`;
}
