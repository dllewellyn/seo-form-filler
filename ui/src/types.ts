export type Id = string | number;

export type Column = {
  id: Id;
  title: string;
};

export type Target = {
  id: Id;
  columnId: Id;
  domain: string;
  url: string;
  targetUrl: string;
  pitchDraft?: string;
  notes?: string;
};
