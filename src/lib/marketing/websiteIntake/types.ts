
export interface WebsiteFactCandidate {
  readonly id: string;
  readonly statement: string;
  readonly sourceUrl: string;
  readonly evidence: string;
}

export interface WebsiteIntakeResult {
  readonly websiteUrl: string;
  readonly title?: string;
  readonly fetchedAt: string;
  readonly facts: WebsiteFactCandidate[];
}
