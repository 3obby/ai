export interface TogglePrompt {
  id: string;
  text: string;
  enabled: boolean;
}

export interface ToggleContainer {
  id: string;
  title: string;
  enabled: boolean;
  prompts: TogglePrompt[];
}

export interface PromptsState {
  containers: ToggleContainer[];
  standalonePrompts: TogglePrompt[];
  isDrawerOpen: boolean;
}

export type PromptsAction =
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'ADD_PROMPT'; prompt: TogglePrompt }
  | { type: 'REMOVE_PROMPT'; promptId: string }
  | { type: 'UPDATE_PROMPT'; promptId: string; updates: Partial<TogglePrompt> }
  | { type: 'TOGGLE_PROMPT'; promptId: string }
  | { type: 'ADD_CONTAINER'; container: ToggleContainer }
  | { type: 'REMOVE_CONTAINER'; containerId: string }
  | { type: 'UPDATE_CONTAINER'; containerId: string; updates: Partial<ToggleContainer> }
  | { type: 'TOGGLE_CONTAINER'; containerId: string }
  | { type: 'ADD_PROMPT_TO_CONTAINER'; promptId: string; containerId: string }
  | { type: 'REMOVE_PROMPT_FROM_CONTAINER'; promptId: string; containerId: string }
  | { type: 'MOVE_PROMPT'; promptId: string; fromContainerId?: string; toContainerId?: string }; 