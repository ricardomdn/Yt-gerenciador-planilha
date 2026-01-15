
export interface CostItem {
  id: string;
  role: string;
  type: 'long' | 'short';
  value: number;
}

export interface GeneratorState {
  channelId: string;
  costs: CostItem[];
}
