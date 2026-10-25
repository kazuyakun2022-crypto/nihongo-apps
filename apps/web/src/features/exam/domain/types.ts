export interface PlacementQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface PlacementQuestionsResponse {
  questions: PlacementQuestion[];
  total: number;
  passingScore: number;
}

export interface PlacementAnswer {
  questionId: string;
  answer: string;
}

export interface PlacementResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  passingScore: number;
}
