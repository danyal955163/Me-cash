export type TaskCategory = {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
};

export type TaskCategoryRelation = Pick<TaskCategory, 'id' | 'name'> | null;
