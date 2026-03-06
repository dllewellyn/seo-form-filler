export type Id = string | number;

export type Column = {
  id: Id;
  title: string;
};

export type Target = {
  id: Id;
  columnId: Id;
  type: 'directory' | 'outreach';
  domain: string;
  url: string;
  targetUrl: string;
  pitchDraft?: string;
  notes?: string;
  isGeneratingPitch?: boolean;
};

export type Profile = {
  id: string;
  userId: string;
  targetUrl: string;
  companyName: string;
  shortDescription: string;
  longDescription: string;
  keywords: string[];
  founderName: string;
  dynamicFields: Record<string, string>;
};
