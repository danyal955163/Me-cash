export const TASK_CATEGORIES = [
  { value: 'download_play', label: 'Download & Play' },
  { value: 'share_message', label: 'Share Message' },
  { value: 'social_post', label: 'Social Post' },
  { value: 'simple', label: 'Simple Tasks' },
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number]['value'];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  download_play: 'Download & Play',
  share_message: 'Share Message',
  social_post: 'Social Post',
  simple: 'Simple Tasks',
};
