export interface ReqGenerateAudio {
  reason: 'vo';
  indexUri: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
  entityUri: string;
  entityType: 'q_ann';
  vars: Record<string, any>;
}

export interface RespGenerateAudio {
  url: string;
  mediaType: 'audio/mpeg'
}

