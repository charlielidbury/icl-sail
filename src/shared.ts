export interface RaceResult {
  id: string;
  number: number;
  video: string | null;
  raceteam: {
    team: {
      id: string;
      name: string;
    };
    result: number[] | null;
  }[];
}
