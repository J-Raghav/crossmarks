export enum SupportedContexts {
  link = "link",
  audio = "audio",
  image = "image",
  video = "video",
  selection = "selection",
}

export type CrossmarkType = {
  title: string;
  context?: SupportedContexts;
  content: string;
  sourcePage: string;
  tags: string[];
  favicon?: string;
  createDate: string;
};
