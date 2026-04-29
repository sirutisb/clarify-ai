export interface Interpretation {
  text: string;
  prob: number;
}

export interface ClarificationResult {
  shouldClarify: boolean;
  clarifyingQuestion?: string;
  interpretations?: Interpretation[];
  originalMessage: string;
  thinking?: string;
  debug?: {
    strategy: string;
    entropy?: number;
    clusters?: number[][];
    rawResponse?: string;
  };
}

export interface ClarificationOptions {
  entropyThreshold?: number;
  onThinking?: (text: string) => void;
}

export interface ClarificationStrategy {
  name: string;
  evaluate(prompt: string, options?: ClarificationOptions): Promise<ClarificationResult>;
}
